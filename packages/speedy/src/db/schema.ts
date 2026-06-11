import { randomBytes } from 'node:crypto'

import { isNotNull } from 'drizzle-orm'
import { type AnyPgColumn, pgTable, pgEnum, uuid, text, timestamp, index, uniqueIndex, integer, boolean, jsonb, primaryKey } from 'drizzle-orm/pg-core'

function uuidv7(): string {
  const ms = Date.now()
  const buf = randomBytes(16)
  buf.writeUIntBE(ms, 0, 6)
  buf[6] = (buf[6]! & 0x0f) | 0x70
  buf[8] = (buf[8]! & 0x3f) | 0x80
  const h = buf.toString('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export const userStatusEnum = pgEnum('user_status', ['online', 'idle', 'dnd', 'offline'])
export const memberRoleEnum = pgEnum('member_role', ['owner', 'admin', 'member'])
export const channelKindEnum = pgEnum('channel_kind', ['text', 'voice', 'dm'])
export const fileStatusEnum = pgEnum('file_status', ['pending', 'ready', 'failed'])
export const mentionTypeEnum = pgEnum('mention_type', ['user', 'everyone', 'here'])
export const auditActionEnum = pgEnum('audit_action', [
  'channel.create', 'channel.update', 'channel.delete',
  'member.promote', 'member.demote', 'member.kick',
  'invite.create',  'invite.revoke',
  'emoji.create',   'emoji.delete',
])
export const auditTargetTypeEnum = pgEnum('audit_target_type', [
  'channel', 'user', 'invite', 'emoji', 'server',
])

export const users = pgTable('users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  username:     text('username').notNull().unique(),
  displayName:  text('display_name').notNull(),
  email:        text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  avatarUrl:    text('avatar_url'),
  status:       userStatusEnum('status').notNull().default('offline'),
  customStatus: text('custom_status'),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt:   timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
})

export const servers = pgTable('servers', {
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      text('name').notNull(),
  iconUrl:   text('icon_url'),
  ownerId:   uuid('owner_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const channels = pgTable('channels', {
  id:               uuid('id').primaryKey().defaultRandom(),
  serverId:         uuid('server_id').references(() => servers.id, { onDelete: 'cascade' }),
  name:             text('name').notNull(),
  kind:             channelKindEnum('kind').notNull().default('text'),
  category:         text('category'),
  topic:            text('topic'),
  position:         integer('position').notNull().default(0),
  // Threads (T-080): тред — это просто канал с указанием родителя. parent_channel_id
  // каскадно удаляется (нет смысла в висящих тредах), parent_message_id обнуляется
  // при soft/hard delete сообщения (тред отвязывается, но остаётся доступным).
  parentChannelId:  uuid('parent_channel_id').references((): AnyPgColumn => channels.id, { onDelete: 'cascade' }),
  parentMessageId:  uuid('parent_message_id').references((): AnyPgColumn => messages.id, { onDelete: 'set null' }),
  archivedAt:       timestamp('archived_at', { withTimezone: true }),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
},
(t) => ({
  serverIdIdx:        index('channels_server_id_idx').on(t.serverId),
  parentMessageIdx:   index('channels_parent_message_id_idx').on(t.parentMessageId),
  parentChannelIdx:   index('channels_parent_channel_archived_idx').on(t.parentChannelId, t.archivedAt),
}))

export const dmChannels = pgTable(
  'dm_channels',
  {
    channelId:  uuid('channel_id').primaryKey().references(() => channels.id, { onDelete: 'cascade' }),
    // Канонический порядок (userA < userB) гарантирует, что для любой пары
    // существует ровно одна запись — упрощает идемпотентный POST /dm/with.
    userAId:    uuid('user_a_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    userBId:    uuid('user_b_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    lastReadA:  uuid('last_read_a'),
    lastReadB:  uuid('last_read_b'),
    createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pairUnique: uniqueIndex('dm_channels_pair_unique_idx').on(t.userAId, t.userBId),
    userAIdx:   index('dm_channels_user_a_idx').on(t.userAId),
    userBIdx:   index('dm_channels_user_b_idx').on(t.userBId),
  }),
)

export const serverMembers = pgTable(
  'server_members',
  {
    serverId: uuid('server_id').notNull().references(() => servers.id, { onDelete: 'cascade' }),
    userId:   uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role:     memberRoleEnum('role').notNull().default('member'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk:          primaryKey({ columns: [t.serverId, t.userId] }),
    serverIdIdx: index('server_members_server_id_idx').on(t.serverId),
    userIdIdx:   index('server_members_user_id_idx').on(t.userId),
  }),
)

export const invites = pgTable(
  'invites',
  {
    code:      text('code').primaryKey(),
    serverId:  uuid('server_id').notNull().references(() => servers.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    maxUses:   integer('max_uses'),
    useCount:  integer('use_count').notNull().default(0),
    revoked:   boolean('revoked').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    serverIdIdx: index('invites_server_id_idx').on(t.serverId),
  }),
)

export const messages = pgTable(
  'messages',
  {
    id:          uuid('id').primaryKey().$defaultFn(uuidv7),
    channelId:   uuid('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
    authorId:    uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    content:     text('content').notNull(),
    replyToId:   uuid('reply_to_id').references((): AnyPgColumn => messages.id, { onDelete: 'set null' }),
    clientNonce: text('client_nonce'),
    createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    editedAt:    timestamp('edited_at', { withTimezone: true }),
    deletedAt:   timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    channelIdIdx:      index('messages_channel_id_id_idx').on(t.channelId, t.id),
    clientNonceUnique: uniqueIndex('messages_author_nonce_unique_idx')
      .on(t.authorId, t.clientNonce)
      .where(isNotNull(t.clientNonce)),
  }),
)

export const reactions = pgTable(
  'reactions',
  {
    messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
    userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    emoji:     text('emoji').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk:       primaryKey({ columns: [t.messageId, t.userId, t.emoji] }),
    msgIdIdx: index('reactions_message_id_idx').on(t.messageId),
  }),
)

export const files = pgTable(
  'files',
  {
    id:           uuid('id').primaryKey().$defaultFn(uuidv7),
    ownerId:      uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    messageId:    uuid('message_id').references((): AnyPgColumn => messages.id, { onDelete: 'cascade' }),
    key:          text('key').notNull(),
    // S3-ключ миниатюры (webp ≤480px), генерируется на finalize для картинок.
    thumbKey:     text('thumb_key'),
    originalName: text('original_name').notNull(),
    contentType:  text('content_type').notNull(),
    sizeBytes:    integer('size_bytes').notNull(),
    width:        integer('width'),
    height:       integer('height'),
    status:       fileStatusEnum('status').notNull().default('pending'),
    createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ownerIdIdx:   index('files_owner_id_idx').on(t.ownerId),
    messageIdIdx: index('files_message_id_idx').on(t.messageId),
  }),
)

export const mentions = pgTable(
  'mentions',
  {
    id:              uuid('id').primaryKey().defaultRandom(),
    messageId:       uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
    mentionedUserId: uuid('mentioned_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    mentionType:     mentionTypeEnum('mention_type').notNull().default('user'),
    createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    readAt:          timestamp('read_at', { withTimezone: true }),
  },
  (t) => ({
    pairUnique:    uniqueIndex('mentions_message_user_unique_idx').on(t.messageId, t.mentionedUserId),
    userInboxIdx:  index('mentions_user_unread_idx').on(t.mentionedUserId, t.readAt),
  }),
)

export const auditLog = pgTable(
  'audit_log',
  {
    id:         uuid('id').primaryKey().defaultRandom(),
    serverId:   uuid('server_id').notNull().references(() => servers.id, { onDelete: 'cascade' }),
    // Actor может оказаться null если пользователь удалил аккаунт после действия —
    // запись остаётся, видна как «<удалённый>».
    actorId:    uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    action:     auditActionEnum('action').notNull(),
    targetType: auditTargetTypeEnum('target_type').notNull(),
    // Цель тоже nullable: при delete мы сохраняем имя в metadata, а сам
    // объект уже мог быть удалён каскадом.
    targetId:   uuid('target_id'),
    metadata:   jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Главный индекс для пагинации: WHERE server = ? ORDER BY created_at DESC.
    serverCreatedIdx: index('audit_log_server_created_idx').on(t.serverId, t.createdAt),
  }),
)

export const emoji = pgTable(
  'emoji',
  {
    id:         uuid('id').primaryKey().defaultRandom(),
    serverId:   uuid('server_id').notNull().references(() => servers.id, { onDelete: 'cascade' }),
    name:       text('name').notNull(),
    imageUrl:   text('image_url').notNull(),
    storageKey: text('storage_key').notNull(),
    animated:   boolean('animated').notNull().default(false),
    uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    serverIdIdx:    index('emoji_server_id_idx').on(t.serverId),
    serverNameUniq: uniqueIndex('emoji_server_name_unique_idx').on(t.serverId, t.name),
  }),
)

export const sessions = pgTable(
  'sessions',
  {
    id:                uuid('id').primaryKey().defaultRandom(),
    userId:            uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenHash:  text('refresh_token_hash').notNull().unique(),
    userAgent:         text('user_agent'),
    ipAddress:         text('ip_address'),
    createdAt:         timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt:        timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt:         timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => ({
    userIdIdx: index('sessions_user_id_idx').on(t.userId),
  }),
)
