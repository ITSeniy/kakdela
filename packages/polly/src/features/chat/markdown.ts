import DOMPurify from 'dompurify'
import MarkdownIt from 'markdown-it'

import type { Channel, CustomEmoji, MemberPublic } from '@kakdela/ginzu/api-types'

import { findChannelByMention, findMemberByMention } from './mentions.js'

export interface RenderEnv {
  members?: ReadonlyMap<string, MemberPublic>
  channels?: ReadonlyMap<string, Channel>
  /** Карта custom emoji сервера по `name` — резолвится в `<img class="kd-emoji">`. */
  emoji?: ReadonlyMap<string, CustomEmoji>
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: false,
})

// `image` намеренно включён: T-053 публикует снапшоты screen share как
// markdown `![](url)` — иначе они будут показываться текстом. DOMPurify
// ниже всё равно фильтрует img.src через ALLOWED_URI_REGEXP, так что
// xss-ом этот канал не становится.
md.disable(['heading'])

// `__underline__` — markdown-it parses double-underscore as strong; we keep
// bold for `**bold**` and render the `__` form as <u> instead.
const defaultStrongOpen = md.renderer.rules.strong_open
const defaultStrongClose = md.renderer.rules.strong_close
md.renderer.rules.strong_open = (tokens, idx, options, env, self) => {
  if (tokens[idx]?.markup === '__') return '<u>'
  if (defaultStrongOpen) return defaultStrongOpen(tokens, idx, options, env, self)
  return self.renderToken(tokens, idx, options)
}
md.renderer.rules.strong_close = (tokens, idx, options, env, self) => {
  if (tokens[idx]?.markup === '__') return '</u>'
  if (defaultStrongClose) return defaultStrongClose(tokens, idx, options, env, self)
  return self.renderToken(tokens, idx, options)
}

// All links should open in the OS browser (we'll intercept clicks in MessageList
// and re-route through Tauri shell when available). Set target/rel up-front.
const defaultLinkOpen = md.renderer.rules.link_open
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  if (token) {
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noopener noreferrer')
  }
  if (defaultLinkOpen) return defaultLinkOpen(tokens, idx, options, env, self)
  return self.renderToken(tokens, idx, options)
}

md.inline.ruler.before('emphasis', 'mention', (state, silent) => {
  if (silent) return false
  const ch = state.src.charCodeAt(state.pos)
  if (ch !== 0x40 /* @ */ && ch !== 0x23 /* # */) return false

  // Mentions only at start of inline or after whitespace — avoid matching
  // `email@example.com` or `path/#anchor`.
  if (state.pos > 0) {
    const prev = state.src.charAt(state.pos - 1)
    if (!/\s/.test(prev)) return false
  }

  const rest = state.src.slice(state.pos + 1)
  const match = /^[\p{L}\p{N}_-]+/u.exec(rest)
  if (!match) return false
  const name = match[0]
  const env = (state.env ?? {}) as RenderEnv

  if (ch === 0x40) {
    // @everyone / @here — broadcast-чипы (fan-out делает сервер).
    if (name === 'everyone' || name === 'here') {
      const open = state.push('mention_user_open', 'span', 1)
      open.attrSet('data-mention', 'broadcast')
      open.attrSet('class', 'kd-mention-user')
      const text = state.push('text', '', 0)
      text.content = '@' + name
      state.push('mention_user_close', 'span', -1)
      state.pos += 1 + name.length
      return true
    }
    const member = findMemberByMention(env.members, name)
    if (!member) return false
    const open = state.push('mention_user_open', 'span', 1)
    open.attrSet('data-mention', 'user')
    open.attrSet('data-id', member.id)
    open.attrSet('class', 'kd-mention-user')
    const text = state.push('text', '', 0)
    text.content = '@' + member.displayName
    state.push('mention_user_close', 'span', -1)
    state.pos += 1 + name.length
    return true
  }

  const channel = findChannelByMention(env.channels, name)
  if (!channel) return false
  const open = state.push('mention_channel_open', 'a', 1)
  open.attrSet('data-mention', 'channel')
  open.attrSet('data-id', channel.id)
  open.attrSet('class', 'kd-mention-channel')
  open.attrSet('href', '#')
  const text = state.push('text', '', 0)
  text.content = '#' + channel.name
  state.push('mention_channel_close', 'a', -1)
  state.pos += 1 + name.length
  return true
})

// `:emoji_name:` → server-scoped custom emoji image (T-081). Резолв через
// RenderEnv.emoji: имена, которых нет в карте, остаются текстом — это
// сохраняет обратную совместимость, если emoji удалили после отправки.
md.inline.ruler.before('emphasis', 'custom_emoji', (state, silent) => {
  if (silent) return false
  if (state.src.charCodeAt(state.pos) !== 0x3a /* : */) return false

  const rest = state.src.slice(state.pos + 1)
  const match = /^([a-z0-9_]+):/.exec(rest)
  if (!match) return false
  const name = match[1]
  if (!name) return false

  const env = (state.env ?? {}) as RenderEnv
  const emoji = env.emoji?.get(name)
  if (!emoji) return false

  const token = state.push('custom_emoji', 'img', 0)
  token.attrSet('src', emoji.imageUrl)
  token.attrSet('alt', `:${name}:`)
  token.attrSet('class', 'kd-emoji')
  token.attrSet('draggable', 'false')
  // ":<name>:" — 2 colons + name length
  state.pos += 2 + name.length
  return true
})

// `||спойлер||` — скрытый текст в духе Discord. Раскрытие — кликом
// (MessageList.handleContentClick тогглит класс kd-spoiler-open).
// Вложенный markdown внутри спойлера не парсим — текст как есть.
md.inline.ruler.before('emphasis', 'spoiler', (state, silent) => {
  const start = state.pos
  if (state.src.charCodeAt(start) !== 0x7c /* | */) return false
  if (state.src.charCodeAt(start + 1) !== 0x7c) return false
  const end = state.src.indexOf('||', start + 2)
  if (end < 0) return false
  const content = state.src.slice(start + 2, end)
  if (!content.trim()) return false
  if (!silent) {
    const open = state.push('spoiler_open', 'span', 1)
    open.attrSet('class', 'kd-spoiler')
    open.attrSet('data-spoiler', '1')
    const text = state.push('text', '', 0)
    text.content = content
    state.push('spoiler_close', 'span', -1)
  }
  state.pos = end + 2
  return true
})

export function renderMarkdown(text: string, env?: RenderEnv): string {
  const html = md.render(text, env ?? {})
  if (typeof window === 'undefined') return html
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['data-mention', 'data-id', 'data-spoiler', 'target', 'rel', 'draggable'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|ftp):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  })
}
