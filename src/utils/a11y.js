// Makes a non-<button> element (a styled <div>/<span> used as a clickable row)
// keyboard-operable and announced as a control. Spread the result onto the
// element in place of a bare `onClick`:
//
//   <div {...clickable(() => onSelect(id), `View ${name}`)} style={...}>
//
// We keep the <div> rather than a real <button> because the global button
// styles (uppercase, bordered, green) would wreck the list/row layout.
export function clickable(onActivate, label) {
  return {
    role: 'button',
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onActivate()
      }
    },
    ...(label ? { 'aria-label': label } : {}),
  }
}
