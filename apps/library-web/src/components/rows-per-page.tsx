const PAGE_SIZE_OPTIONS = [10, 20, 25, 50, 100]

export function RowsPerPageSelect({
  value,
  onChange,
}: {
  value: number
  onChange: (size: number) => void
}) {
  const options = PAGE_SIZE_OPTIONS.includes(value) ? PAGE_SIZE_OPTIONS : [value, ...PAGE_SIZE_OPTIONS]
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      Show
      <select
        aria-label="Rows per page"
        data-testid="rows-per-page"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-900"
      >
        {options.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </label>
  )
}
