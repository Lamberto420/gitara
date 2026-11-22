/**
 * Korony do zdobycia w tej wersji (👑1 – do końca z gryfem, 👑2 – bez gryfu). Korona 3 (rytm)
 * dojdzie z grą w tempie – nie pokazujemy miejsca na koronę, której jeszcze nie da się zdobyć.
 */
export const CROWNS_AVAILABLE = 2

export default function Crowns({ crown }: { crown: number }) {
  return (
    <span className="crowns" aria-label={`Korony: ${crown} z ${CROWNS_AVAILABLE}`}>
      {Array.from({ length: CROWNS_AVAILABLE }, (_, i) => (
        <span key={i} className={i < crown ? 'crown' : 'crown empty'}>
          👑
        </span>
      ))}
    </span>
  )
}
