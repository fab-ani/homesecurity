export class ChunkAssembler {
  private currentFrameId: number | null = null;
  private chunks: (Uint8Array | null)[] = [];

  addChunk(payload: Uint8Array): Uint8Array | null {
    if (payload.length < 4) return null;
    const frameId = (payload[0] << 8) | payload[1];
    const seq = payload[2];
    const total = payload[3];
    if (total === 0 || seq >= total) return null;

    const data = payload.slice(4);

    if (this.currentFrameId !== frameId) {
      this.currentFrameId = frameId;
      this.chunks = new Array(total).fill(null);
    }

    if (seq < this.chunks.length) this.chunks[seq] = data;

    if (this.chunks.every((c) => c !== null)) {
      const parts = this.chunks as Uint8Array[];
      const totalLen = parts.reduce((s, c) => s + c.length, 0);
      const result = new Uint8Array(totalLen);
      let offset = 0;
      for (const c of parts) {
        result.set(c, offset);
        offset += c.length;
      }
      this.currentFrameId = null;
      this.chunks = [];
      return result;
    }
    return null;
  }
}
