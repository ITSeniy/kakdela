// Insertable Streams for MediaStreamTrack — MediaStreamTrackGenerator.
// Экспериментальный API, ещё не в стандартном lib.dom, но есть в Chromium /
// WebView2 (проверено: `new MediaStreamTrackGenerator({kind:'audio'})` работает).
// Нужен для Stage C шаг 2 (нативный звук → живой MediaStreamTrack), T-094.

interface MediaStreamTrackGeneratorInit {
  kind: 'audio' | 'video'
}

declare class MediaStreamTrackGenerator extends MediaStreamTrack {
  constructor(init: MediaStreamTrackGeneratorInit)
  // Пишем сюда AudioData (для kind:'audio'); VideoFrame не используем.
  readonly writable: WritableStream<AudioData>
}
