import { z } from 'zod'

export const UserSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(2).max(32),
  displayName: z.string().max(64),
  avatarUrl: z.string().url().nullable(),
  status: z.enum(['online', 'idle', 'dnd', 'offline']),
  customStatus: z.string().max(128).nullable().optional(),
})
export type User = z.infer<typeof UserSchema>

export const ServerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(64),
  iconUrl: z.string().url().nullable().optional(),
})
export type Server = z.infer<typeof ServerSchema>

export const ChannelSchema = z.object({
  id: z.string().uuid(),
  serverId: z.string().uuid().nullable(),
  name: z.string().min(1).max(100),
  kind: z.enum(['text', 'voice', 'dm']),
  category: z.string().max(64).nullable().optional(),
  topic: z.string().max(256).nullable().optional(),
  position: z.number().int().nonnegative(),
  parentChannelId: z.string().uuid().nullable().optional(),
  parentMessageId: z.string().uuid().nullable().optional(),
  archivedAt: z.string().nullable().optional(),
  // Настройки канала («обзор»). Дефолты совпадают с колонками БД.
  slowModeSec:    z.number().int().nonnegative().default(0),
  autoDeleteSec:  z.number().int().positive().nullable().optional(),
  isDefault:      z.boolean().default(false),
  friendsOnly:    z.boolean().default(false),
  nsfw:           z.boolean().default(false),
  threadsAllowed: z.boolean().default(true),
})
export type Channel = z.infer<typeof ChannelSchema>

export const ReplyRefSchema = z.union([
  z.object({ id: z.string().uuid(), deleted: z.literal(true) }),
  z.object({ id: z.string().uuid(), deleted: z.literal(false), authorName: z.string(), content: z.string() }),
])
export type ReplyRef = z.infer<typeof ReplyRefSchema>

export const ReactionAggregateSchema = z.object({
  emoji: z.string(),
  count: z.number().int().nonnegative(),
  users: z.array(z.string().uuid()),
})
export type ReactionAggregate = z.infer<typeof ReactionAggregateSchema>

export const AttachmentKindSchema = z.enum(['image', 'video', 'audio', 'pdf', 'text', 'archive', 'other'])
export type AttachmentKind = z.infer<typeof AttachmentKindSchema>

export const AttachmentSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  /** Серверная миниатюра (webp ≤480px) для превью в чате; null у gif,
      мелких картинок и не-изображений. Оригинал — всегда в url. */
  thumbUrl: z.string().url().nullable().optional(),
  kind: AttachmentKindSchema,
  contentType: z.string(),
  originalName: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  /** Вложение помечено спойлером — клиент блюрит его до клика. */
  spoiler: z.boolean().default(false),
})
export type Attachment = z.infer<typeof AttachmentSchema>

export const ThreadInfoSchema = z.object({
  channelId:     z.string().uuid(),
  name:          z.string(),
  messageCount:  z.number().int().nonnegative(),
  lastMessageAt: z.string().nullable(),
  archivedAt:    z.string().nullable(),
})
export type ThreadInfo = z.infer<typeof ThreadInfoSchema>

// Снимок пересланного сообщения: денормализуем автора/текст/вложения на момент
// пересыла, чтобы карточка рендерилась даже если получатель не имеет доступа к
// исходному каналу или оригинал потом изменили/удалили. messageId/channelId —
// для перехода к оригиналу, когда он доступен.
export const ForwardedRefSchema = z.object({
  messageId:    z.string().uuid().nullable(),
  channelId:    z.string().uuid().nullable(),
  channelLabel: z.string(),
  authorId:     z.string().uuid(),
  authorName:   z.string(),
  content:      z.string(),
  createdAt:    z.string(),
  attachments:  z.array(AttachmentSchema).default([]),
})
export type ForwardedRef = z.infer<typeof ForwardedRefSchema>

// Превью ссылки (Open Graph / oEmbed-метаданные). Снимок снимается сервером
// асинхронно после отправки и денормализуется в сообщение, поэтому карточка
// переживает перезагрузку и не зависит от доступности исходного сайта.
// kind='image' — прямая ссылка на картинку (рендерим только изображение,
// без «обвязки» карточки). kind='link' — обычная OG-карточка.
export const LinkPreviewSchema = z.object({
  /** Канонический URL (og:url или итоговый после редиректов). */
  url:         z.string().url(),
  kind:        z.enum(['link', 'image']).default('link'),
  siteName:    z.string().nullable().optional(),
  title:       z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  imageUrl:    z.string().url().nullable().optional(),
})
export type LinkPreview = z.infer<typeof LinkPreviewSchema>

export const MessageSchema = z.object({
  id: z.string().uuid(),
  channelId: z.string().uuid(),
  authorId: z.string().uuid(),
  content: z.string().max(4000),
  replyToId: z.string().uuid().nullable().optional(),
  replyTo: ReplyRefSchema.nullable().optional(),
  createdAt: z.string(),
  editedAt: z.string().nullable().optional(),
  reactions: z.array(ReactionAggregateSchema).default([]),
  attachments: z.array(AttachmentSchema).default([]),
  thread: ThreadInfoSchema.nullable().optional(),
  /** Закреплено в канале (pinnedAt — момент закрепления). */
  pinned: z.boolean().default(false),
  pinnedAt: z.string().nullable().optional(),
  /** Пересланное сообщение — снимок оригинала. */
  forwarded: ForwardedRefSchema.nullable().optional(),
  /** OG-превью ссылок из текста. Подъезжают асинхронно (WS msg.embeds). */
  linkPreviews: z.array(LinkPreviewSchema).default([]),
})
export type Message = z.infer<typeof MessageSchema>

export const ServerMemberSchema = z.object({
  serverId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member']),
  joinedAt: z.string(),
})
export type ServerMember = z.infer<typeof ServerMemberSchema>

// ───── Roles (система ролей с разрешениями) ─────

const roleColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'цвет: #rrggbb').nullable()
const roleNameSchema = z.string().min(1).max(32)

export const RoleSchema = z.object({
  id:          z.string().uuid(),
  serverId:    z.string().uuid(),
  name:        z.string(),
  color:       z.string().nullable(),
  /** Битовая маска разрешений (см. @kakdela/ginzu/permissions). */
  permissions: z.number().int().nonnegative(),
  /** Чем выше — тем старше; @everyone = 0. Определяет иерархию. */
  position:    z.number().int(),
  /** Показывать носителей отдельной группой в списке участников. */
  hoist:       z.boolean(),
  mentionable: z.boolean(),
  /** Базовая роль @everyone — её нельзя удалить/переименовать/переместить. */
  isEveryone:  z.boolean(),
})
export type Role = z.infer<typeof RoleSchema>

/** Краткая роль для бейджей в профиле / списке участников. */
export const RoleRefSchema = z.object({
  id:       z.string().uuid(),
  name:     z.string(),
  color:    z.string().nullable(),
  position: z.number().int(),
  hoist:    z.boolean(),
})
export type RoleRef = z.infer<typeof RoleRefSchema>

export const RolesListResponseSchema = z.object({
  roles: z.array(RoleSchema),
})
export type RolesListResponse = z.infer<typeof RolesListResponseSchema>

export const CreateRoleRequestSchema = z.object({
  name:        roleNameSchema,
  color:       roleColorSchema.optional(),
  permissions: z.number().int().nonnegative().optional(),
  hoist:       z.boolean().optional(),
  mentionable: z.boolean().optional(),
})
export type CreateRoleRequest = z.infer<typeof CreateRoleRequestSchema>

export const PatchRoleRequestSchema = z.object({
  name:        roleNameSchema.optional(),
  color:       roleColorSchema.optional(),
  permissions: z.number().int().nonnegative().optional(),
  position:    z.number().int().nonnegative().optional(),
  hoist:       z.boolean().optional(),
  mentionable: z.boolean().optional(),
})
export type PatchRoleRequest = z.infer<typeof PatchRoleRequestSchema>

export const SetMemberRolesRequestSchema = z.object({
  roleIds: z.array(z.string().uuid()).max(50),
})
export type SetMemberRolesRequest = z.infer<typeof SetMemberRolesRequestSchema>

// ───── Auth ─────

const usernameSchema = z
  .string()
  .min(2)
  .max(32)
  .regex(/^[a-z0-9_]+$/, 'username: только a-z, 0-9, _')

const passwordSchema = z.string().min(6).max(200)

export const RegisterRequestSchema = z.object({
  inviteCode: z.string().min(4).max(32),
  username: usernameSchema,
  // Имя задаётся на втором шаге регистрации (оформление профиля);
  // без него сервер подставляет username.
  displayName: z.string().min(1).max(64).optional(),
  email: z.string().email().max(254),
  password: passwordSchema,
})
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>

export const LoginRequestSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
})
export type LoginRequest = z.infer<typeof LoginRequestSchema>

export const RefreshRequestSchema = z.object({
  refreshToken: z.string().min(1).optional(),
})
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  user: UserSchema,
})
export type AuthResponse = z.infer<typeof AuthResponseSchema>

export const InvitePublicSchema = z.object({
  serverName: z.string(),
  serverIcon: z.string().url().nullable(),
  expiresAt: z.string().nullable(),
})
export type InvitePublic = z.infer<typeof InvitePublicSchema>

export const CreateInviteResponseSchema = z.object({
  code: z.string(),
  url: z.string(),
})
export type CreateInviteResponse = z.infer<typeof CreateInviteResponseSchema>

export const SendMessageRequestSchema = z.object({
  content: z.string().max(4000),
  replyToId: z.string().uuid().optional(),
  clientNonce: z.string().max(64).optional(),
  attachments: z.array(z.string().uuid()).max(10).optional(),
  /** Подмножество attachments, которые нужно пометить спойлером. */
  spoilerAttachments: z.array(z.string().uuid()).max(10).optional(),
}).refine(
  (v) => v.content.trim().length > 0 || (v.attachments && v.attachments.length > 0),
  { message: 'message must have content or attachments', path: ['content'] },
)
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>

export const EditMessageRequestSchema = z.object({
  content: z.string().min(1).max(4000),
})
export type EditMessageRequest = z.infer<typeof EditMessageRequestSchema>

export const MessagesPageSchema = z.object({
  messages: z.array(MessageSchema),
  nextCursor: z.string().uuid().nullable(),
})
export type MessagesPage = z.infer<typeof MessagesPageSchema>

export const ForwardMessageRequestSchema = z.object({
  toChannelId: z.string().uuid(),
  /** Необязательная подпись от пересылающего над карточкой оригинала. */
  note: z.string().max(4000).optional(),
})
export type ForwardMessageRequest = z.infer<typeof ForwardMessageRequestSchema>

export const PinnedMessagesResponseSchema = z.object({
  messages: z.array(MessageSchema),
})
export type PinnedMessagesResponse = z.infer<typeof PinnedMessagesResponseSchema>

// ───── GIFs (GIPHY-прокси) ─────

export const GiphyGifSchema = z.object({
  id: z.string(),
  /** URL гифки для отправки/показа (downsized с CDN GIPHY — не рехостим). */
  url: z.string().url(),
  /** Маленькое превью для грида пикера. */
  previewUrl: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  title: z.string(),
})
export type GiphyGif = z.infer<typeof GiphyGifSchema>

export const GiphyResponseSchema = z.object({
  gifs: z.array(GiphyGifSchema),
  /** Offset следующей страницы или null, если результаты кончились. */
  nextOffset: z.number().int().nonnegative().nullable(),
})
export type GiphyResponse = z.infer<typeof GiphyResponseSchema>

export const GiphyConfigSchema = z.object({ enabled: z.boolean() })
export type GiphyConfig = z.infer<typeof GiphyConfigSchema>

export const MemberPublicSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().max(64),
  // Логин-ник (@username) — нужен для упоминаний `@ник`. Optional, чтобы
  // не ломать старые места, где участник собирается без него.
  username: z.string().optional(),
  avatarUrl: z.string().url().nullable(),
  status: z.enum(['online', 'idle', 'dnd', 'offline']),
  customStatus: z.string().max(128).nullable().optional(),
  role: z.enum(['owner', 'admin', 'member']),
  // Назначенные кастомные роли (без @everyone), от старшей к младшей.
  roles: z.array(RoleRefSchema).default([]),
  // Эффективная маска прав участника (builtin role ∪ @everyone ∪ кастомные).
  permissions: z.number().int().nonnegative().default(0),
})
export type MemberPublic = z.infer<typeof MemberPublicSchema>

export const ChannelCategorySchema = z.object({
  name: z.string().min(1).max(64),
  position: z.number().int().nonnegative(),
})
export type ChannelCategory = z.infer<typeof ChannelCategorySchema>

export const ServerDetailSchema = z.object({
  server: ServerSchema,
  channels: z.array(ChannelSchema),
  categories: z.array(ChannelCategorySchema),
  memberCount: z.number().int().nonnegative(),
})
export type ServerDetail = z.infer<typeof ServerDetailSchema>

// ───── Server lifecycle (T-083) ─────

export const CreateServerRequestSchema = z.object({
  name:    z.string().min(2).max(64),
  iconUrl: z.string().url().nullable().optional(),
})
export type CreateServerRequest = z.infer<typeof CreateServerRequestSchema>

export const PatchServerRequestSchema = z.object({
  name:    z.string().min(2).max(64).optional(),
  iconUrl: z.string().url().nullable().optional(),
})
export type PatchServerRequest = z.infer<typeof PatchServerRequestSchema>

export const InviteSummarySchema = z.object({
  code:      z.string(),
  url:       z.string(),
  createdBy: z.string().uuid().nullable(),
  expiresAt: z.string().nullable(),
  maxUses:   z.number().int().positive().nullable(),
  useCount:  z.number().int().nonnegative(),
  revoked:   z.boolean(),
  createdAt: z.string(),
})
export type InviteSummary = z.infer<typeof InviteSummarySchema>

export const InvitesListResponseSchema = z.object({
  invites: z.array(InviteSummarySchema),
})
export type InvitesListResponse = z.infer<typeof InvitesListResponseSchema>

export const CreateChannelRequestSchema = z.object({
  name: z.string().min(1).max(64),
  kind: z.enum(['text', 'voice']),
  category: z.string().max(64).optional(),
  topic: z.string().max(256).optional(),
})
export type CreateChannelRequest = z.infer<typeof CreateChannelRequestSchema>

export const CreateCategoryRequestSchema = z.object({
  name: z.string().min(1).max(64),
})
export type CreateCategoryRequest = z.infer<typeof CreateCategoryRequestSchema>

// Допустимые значения для селектов «обзора» (значения — секунды).
export const SLOW_MODE_MAX_SEC = 6 * 60 * 60        // 6 часов
export const AUTO_DELETE_MAX_SEC = 365 * 24 * 60 * 60 // год

export const PatchChannelRequestSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  topic: z.string().max(256).nullable().optional(),
  position: z.number().int().nonnegative().optional(),
  // null = убрать канал из категории (категория — просто метка на канале).
  category: z.string().max(64).nullable().optional(),
  // text↔voice: смена типа уже созданного канала.
  kind: z.enum(['text', 'voice']).optional(),
  // Настройки «обзора». null у autoDeleteSec = выключить автоудаление.
  slowModeSec:    z.number().int().min(0).max(SLOW_MODE_MAX_SEC).optional(),
  autoDeleteSec:  z.number().int().positive().max(AUTO_DELETE_MAX_SEC).nullable().optional(),
  isDefault:      z.boolean().optional(),
  friendsOnly:    z.boolean().optional(),
  nsfw:           z.boolean().optional(),
  threadsAllowed: z.boolean().optional(),
})
export type PatchChannelRequest = z.infer<typeof PatchChannelRequestSchema>

// ───── Threads ─────

export const ThreadSummarySchema = z.object({
  channel:          ChannelSchema,
  parentMessageId:  z.string().uuid().nullable(),
  messageCount:     z.number().int().nonnegative(),
  lastMessageAt:    z.string().nullable(),
})
export type ThreadSummary = z.infer<typeof ThreadSummarySchema>

export const CreateThreadRequestSchema = z.object({
  name:         z.string().min(1).max(100).optional(),
  firstMessage: z.string().min(1).max(4000).optional(),
})
export type CreateThreadRequest = z.infer<typeof CreateThreadRequestSchema>

export const CreateThreadResponseSchema = z.object({
  thread:       ChannelSchema,
  firstMessage: MessageSchema.nullable(),
})
export type CreateThreadResponse = z.infer<typeof CreateThreadResponseSchema>

export const ThreadListResponseSchema = z.object({
  threads: z.array(ThreadSummarySchema),
})
export type ThreadListResponse = z.infer<typeof ThreadListResponseSchema>

// ───── DM ─────

export const DmLastMessagePreviewSchema = z.object({
  id:        z.string().uuid(),
  authorId:  z.string().uuid(),
  preview:   z.string(),
  createdAt: z.string(),
})
export type DmLastMessagePreview = z.infer<typeof DmLastMessagePreviewSchema>

export const DmSummarySchema = z.object({
  channelId:   z.string().uuid(),
  otherUser:   MemberPublicSchema.omit({ role: true }),
  lastMessage: DmLastMessagePreviewSchema.nullable(),
  unreadCount: z.number().int().nonnegative(),
})
export type DmSummary = z.infer<typeof DmSummarySchema>

export const DmListResponseSchema = z.object({
  dms: z.array(DmSummarySchema),
})
export type DmListResponse = z.infer<typeof DmListResponseSchema>

export const DmOpenResponseSchema = z.object({
  channel:   ChannelSchema,
  otherUser: MemberPublicSchema.omit({ role: true }),
  created:   z.boolean(),
})
export type DmOpenResponse = z.infer<typeof DmOpenResponseSchema>

export const DmMarkReadRequestSchema = z.object({
  messageId: z.string().uuid(),
})
export type DmMarkReadRequest = z.infer<typeof DmMarkReadRequestSchema>

// ───── User profile ─────

export const SharedServerSchema = z.object({
  id:       z.string().uuid(),
  name:     z.string(),
  iconUrl:  z.string().url().nullable(),
  role:     z.enum(['owner', 'admin', 'member']),
  joinedAt: z.string(),
})
export type SharedServer = z.infer<typeof SharedServerSchema>

export const UserProfileSchema = z.object({
  id:           z.string().uuid(),
  username:     z.string(),
  displayName:  z.string(),
  avatarUrl:    z.string().url().nullable(),
  customStatus: z.string().nullable(),
  status:       z.enum(['online', 'idle', 'dnd', 'offline']),
  about:        z.string().max(512).nullable(),
  timezone:     z.string().max(64).nullable(),
  bannerUrl:    z.string().url().nullable(),
  createdAt:    z.string(),
  sharedServers: z.array(SharedServerSchema),
  // Кастомные роли по общим с запрашивающим серверам (цветные пилюли).
  roles:        z.array(RoleRefSchema).default([]),
  isSelf:       z.boolean(),
})
export type UserProfile = z.infer<typeof UserProfileSchema>

export const PatchMeRequestSchema = z.object({
  displayName:     z.string().min(1).max(64).optional(),
  customStatus:    z.string().max(128).nullable().optional(),
  avatarUrl:       z.string().url().nullable().optional(),
  about:           z.string().max(512).nullable().optional(),
  timezone:        z.string().max(64).nullable().optional(),
  bannerUrl:       z.string().url().nullable().optional(),
  currentPassword: z.string().min(1).max(200).optional(),
  newPassword:     z.string().min(6).max(200).optional(),
}).refine(
  (v) => (v.newPassword === undefined) === (v.currentPassword === undefined),
  { message: 'newPassword requires currentPassword (and vice versa)', path: ['newPassword'] },
)
export type PatchMeRequest = z.infer<typeof PatchMeRequestSchema>

// ───── Search ─────

export const SearchSortSchema = z.enum(['rank', 'recent'])
export type SearchSort = z.infer<typeof SearchSortSchema>

export const SearchRequestSchema = z.object({
  q:         z.string().min(1).max(200),
  channelId: z.string().uuid().optional(),
  /** Ограничить поиск каналами одного сервера (иконка поиска в шапке канала). */
  serverId:  z.string().uuid().optional(),
  authorId:  z.string().uuid().optional(),
  before:    z.string().datetime().optional(),
  after:     z.string().datetime().optional(),
  limit:     z.coerce.number().int().min(1).max(100).optional().default(50),
  sort:      SearchSortSchema.optional().default('rank'),
})
export type SearchRequest = z.infer<typeof SearchRequestSchema>

export const SearchResultItemSchema = z.object({
  messageId:        z.string().uuid(),
  channelId:        z.string().uuid(),
  channelName:      z.string(),
  channelKind:      z.enum(['text', 'voice', 'dm']),
  serverId:         z.string().uuid().nullable(),
  serverName:       z.string().nullable(),
  authorId:         z.string().uuid(),
  authorName:       z.string(),
  authorAvatarUrl:  z.string().url().nullable(),
  content:          z.string(),
  /** ts_headline-generated HTML-safe markup with <mark>matched</mark> spans. */
  headline:         z.string(),
  createdAt:        z.string(),
  rank:             z.number(),
})
export type SearchResultItem = z.infer<typeof SearchResultItemSchema>

export const SearchResponseSchema = z.object({
  results: z.array(SearchResultItemSchema),
  total:   z.number().int().nonnegative(),
  query:   z.string(),
})
export type SearchResponse = z.infer<typeof SearchResponseSchema>

// ───── Inbox / mentions ─────

export const MentionTypeSchema = z.enum(['user', 'everyone', 'here'])
export type MentionType = z.infer<typeof MentionTypeSchema>

export const InboxMentionSchema = z.object({
  messageId:   z.string().uuid(),
  channelId:   z.string().uuid(),
  channelName: z.string(),
  channelKind: z.enum(['text', 'voice', 'dm']),
  serverId:    z.string().uuid().nullable(),
  serverName:  z.string().nullable(),
  authorId:    z.string().uuid(),
  authorName:  z.string(),
  authorAvatarUrl: z.string().url().nullable(),
  content:     z.string(),
  createdAt:   z.string(),
  mentionType: MentionTypeSchema,
  readAt:      z.string().nullable(),
})
export type InboxMention = z.infer<typeof InboxMentionSchema>

export const InboxMentionsResponseSchema = z.object({
  mentions:   z.array(InboxMentionSchema),
  nextCursor: z.string().uuid().nullable(),
  unreadTotal: z.number().int().nonnegative(),
})
export type InboxMentionsResponse = z.infer<typeof InboxMentionsResponseSchema>

export const InboxMarkReadRequestSchema = z.object({
  messageIds: z.array(z.string().uuid()).min(1).max(200),
})
export type InboxMarkReadRequest = z.infer<typeof InboxMarkReadRequestSchema>

// ───── Voice ─────

export const VoiceParticipantPublicSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  isScreenSharing: z.boolean(),
  // Микрофон замьючен (нет ни одной не-замьюченной mic-дорожки).
  isMuted: z.boolean().default(true),
  // Серверная модерация (админ заглушил микрофон/наушники).
  serverMuted: z.boolean().default(false),
  serverDeafened: z.boolean().default(false),
})
export type VoiceParticipantPublic = z.infer<typeof VoiceParticipantPublicSchema>

export const VoiceModerateRequestSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(['mute', 'unmute', 'deafen', 'undeafen', 'kick', 'move']),
  // Только для action=move: целевой голосовой канал того же сервера.
  toChannelId: z.string().uuid().optional(),
})
export type VoiceModerateRequest = z.infer<typeof VoiceModerateRequestSchema>

export const VoiceJoinResponseSchema = z.object({
  token: z.string(),
  url: z.string(),
  room: z.string(),
  participants: z.array(VoiceParticipantPublicSchema),
})
export type VoiceJoinResponse = z.infer<typeof VoiceJoinResponseSchema>

export const VoiceParticipantsResponseSchema = z.object({
  participants: z.array(VoiceParticipantPublicSchema),
})
export type VoiceParticipantsResponse = z.infer<typeof VoiceParticipantsResponseSchema>

// ───── Files / uploads ─────

export const PRESIGN_ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/flac',
  'audio/mp4',
  'application/pdf',
  'text/plain',
  'application/zip',
  'application/x-7z-compressed',
  'application/x-rar-compressed',
  'application/gzip',
] as const

export const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024

export const PresignRequestSchema = z.object({
  contentType: z.enum(PRESIGN_ALLOWED_CONTENT_TYPES),
  size: z.number().int().positive().max(MAX_ATTACHMENT_SIZE),
  originalName: z.string().min(1).max(255).optional(),
})
export type PresignRequest = z.infer<typeof PresignRequestSchema>

export const PresignResponseSchema = z.object({
  fileId: z.string().uuid(),
  uploadUrl: z.string().url(),
  publicUrl: z.string().url(),
})
export type PresignResponse = z.infer<typeof PresignResponseSchema>

export const FinalizeResponseSchema = z.object({
  attachment: AttachmentSchema,
})
export type FinalizeResponse = z.infer<typeof FinalizeResponseSchema>

// ───── Audit log (T-082) ─────

export const AUDIT_ACTIONS = [
  'channel.create', 'channel.update', 'channel.delete',
  'member.promote', 'member.demote', 'member.kick',
  'invite.create',  'invite.revoke',
  'emoji.create',   'emoji.delete',
] as const

export const AuditActionSchema = z.enum(AUDIT_ACTIONS)
export type AuditAction = z.infer<typeof AuditActionSchema>

export const AuditTargetTypeSchema = z.enum([
  'channel', 'user', 'invite', 'emoji', 'server',
])
export type AuditTargetType = z.infer<typeof AuditTargetTypeSchema>

// Actor может быть null если пользователь удалил аккаунт после действия.
export const AuditActorSchema = z.object({
  id:          z.string().uuid(),
  displayName: z.string(),
  avatarUrl:   z.string().url().nullable(),
}).nullable()
export type AuditActor = z.infer<typeof AuditActorSchema>

export const AuditEntrySchema = z.object({
  id:         z.string().uuid(),
  serverId:   z.string().uuid(),
  actor:      AuditActorSchema,
  action:     AuditActionSchema,
  targetType: AuditTargetTypeSchema,
  targetId:   z.string().uuid().nullable(),
  // jsonb — храним произвольную diff-структуру (before/after, name, code и т.д.)
  metadata:   z.record(z.unknown()).nullable(),
  createdAt:  z.string(),
})
export type AuditEntry = z.infer<typeof AuditEntrySchema>

export const AuditEntriesResponseSchema = z.object({
  entries:    z.array(AuditEntrySchema),
  // ISO timestamp следующей страницы; null когда страниц больше нет.
  nextCursor: z.string().nullable(),
})
export type AuditEntriesResponse = z.infer<typeof AuditEntriesResponseSchema>

// ───── Custom emoji (T-081) ─────

export const CUSTOM_EMOJI_MAX_BYTES = 256 * 1024
export const CUSTOM_EMOJI_MAX_DIMENSION = 128
export const CUSTOM_EMOJI_ALLOWED_CONTENT_TYPES = ['image/png', 'image/gif'] as const

// :name: должно совпадать с тем же лексером, что используется в markdown.
// Сам символ `:` запрещён, как и пробелы — иначе при подстановке в текст
// сообщения парсер не найдёт границу токена.
export const customEmojiNameSchema = z
  .string()
  .min(2)
  .max(32)
  .regex(/^[a-z0-9_]+$/, 'имя: только a-z, 0-9, _')

export const CustomEmojiSchema = z.object({
  id:        z.string().uuid(),
  serverId:  z.string().uuid(),
  name:      z.string(),
  imageUrl:  z.string().url(),
  animated:  z.boolean(),
  createdAt: z.string(),
})
export type CustomEmoji = z.infer<typeof CustomEmojiSchema>

export const EmojiListResponseSchema = z.object({
  emoji: z.array(CustomEmojiSchema),
})
export type EmojiListResponse = z.infer<typeof EmojiListResponseSchema>

export const CreateEmojiRequestSchema = z.object({
  name:        customEmojiNameSchema,
  contentType: z.enum(CUSTOM_EMOJI_ALLOWED_CONTENT_TYPES),
  // Base64-encoded image data (no `data:` prefix). 256 KB raw maps to ~340 KB
  // base64, which is still well within Fastify's default 1 MB body limit.
  dataBase64:  z.string().min(1).max(512 * 1024),
})
export type CreateEmojiRequest = z.infer<typeof CreateEmojiRequestSchema>

export const ErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})
export type ErrorBody = z.infer<typeof ErrorBodySchema>
