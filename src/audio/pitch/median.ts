/** Mediana z ostatnich `size` odczytów – pojedynczy „dziwny” odczyt nie szarpie wskazówką. */
export function createMedianFilter(size: number) {
  const values: number[] = []
  return {
    push(value: number): number {
      values.push(value)
      if (values.length > size) values.shift()
      const sorted = [...values].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
    },
    reset() {
      values.length = 0
    },
  }
}
