# Дизайны из Claude Design

JSX-файлы — это не для прямого импорта, а **референс** для написания React-компонентов в polly.

Соответствие экранов и задач:
| Файл | Где будем использовать |
|---|---|
| `common.jsx` | базовые компоненты (Avatar, ServerIcon, иконки) — растащить в `polly/src/components/` в фазе 1 |
| `final-auth.jsx` | T-012 — экран входа |
| `final-onboarding.jsx` | T-013 — экран онбординга |
| `final-chrome.jsx` | T-018 — главный шелл (рельса серверов, каналы, члены) |
| `final-chat.jsx` | T-019 — экран чата |
| `final-voice.jsx` | T-034 — голосовой канал |
| `final-dm.jsx` | T-064 — DM |
| `final-inbox.jsx` | T-065 — упоминания |
| `final-profile.jsx` | T-068 — профиль |
| `final-settings.jsx` | фаза 5 |

`variant-*.jsx` — это рабочие варианты, на основе которых склеены `final-*`. Можно подсматривать, но source of truth — финалки.
