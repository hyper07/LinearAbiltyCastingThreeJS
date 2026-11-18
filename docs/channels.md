# Channels

[← Back to the README](../README.md)

Every account has a **channel**: its own space, laid out like a video channel. Open yours with
**📺 My channel** on the home page (sign in first).

## What is on a channel

| Tab | What it shows |
| --- | --- |
| **Home** | "Keep going" (your next game in a playlist you started), each playlist as a shelf of numbered cards, and the latest games |
| **Games** | Every game the maker published. The owner can switch each one between 🌐 public and 🔒 private, and add it to a playlist |
| **Playlists** | Ordered lists of games — a course's chapters, a series |
| **Achievements** | Time played, games played and finished, games published, mistakes found, and 14 badges with progress bars. The owner also sees their time game by game |
| **Mistakes found** (owner) | Reports on your games to confirm or dismiss, and the reports you sent |

## Making and publishing

**✨ Make a game** opens the [Game builder](game-builder.md). A game you publish while signed in
lands on your channel. On the Games tab, make it:

- **Public** — on the home page and on your channel for everyone.
- **Private** — only you see it, and people you give your channel's private link.

## Playlists

**＋ New playlist**, give it a title, add games (your own and any public or official game), and
put them in order with the arrows. Opening a playlist shows the game on the left and the list on
the right, like a video playlist: **▶ Play**, **Mark as done**, **Next**. Each game shows your time
in it and a ✓ when done. A game counts as done when you mark it, or after five minutes of play.

## Public, private, sharing

**⚙ Customize** sets the name, handle (the address), a few lines about the channel, its colour and
who can see it.

- A **public** channel is at `#/c/<handle>`. **🔗 Share** copies that link.
- A **private** channel opens only for you and for holders of its **private link**
  (`#/c/<handle>?key=…`), which also shows your private games and playlists. **New link** makes a
  new key; the old link stops working.

## Achievements

Play time is counted while a game is really on screen and the tab is in front, for signed-in
players. The server accepts at most 90 seconds per report and never more than the time that has
really passed, so it cannot be inflated.

Badges: First steps, Explorer, Wanderer, One hour in, Ten hours in, Finisher, Graduate (finish a
whole playlist), Maker, Studio, Crowd-pleaser, Curator, Sharp eye, Fact checker, Chief editor.

## Mistakes in generated games

Games made with AI can hold wrong facts, quests that cannot be finished, or text that makes no
sense. In a playlist's game view, **⚑ Found a mistake** sends the game's maker what is wrong and
where. The maker answers on their Mistakes tab: *They are right* or *Not a mistake*. Finds count
for the finder (dismissed ones do not), and confirmed finds earn the Fact checker badges. Reports
on official games are kept but nobody answers them yet.

## For developers

| Part | File |
| --- | --- |
| Tables `channels`, `playlists`, `play_progress`, `mistake_reports` | `server/db/migrations.js` (009-channels) |
| Rules and the `/api/channels`, `/api/progress`, `/api/reports` routes | `server/channelStore.js` |
| Browser API and the play-time tracker | `src/platform/channelClient.js` |
| The page | `src/ui/ChannelPage.js`, `src/ui/channel.css` |
| Tests | `tests/unit/channels.test.mjs`, `tests/e2e/channels.mjs` |
