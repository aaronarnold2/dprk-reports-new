import { getEntityName } from './entity'

const KEY = 'dprk-investigator-bookmarks'

export function getBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || []
  } catch {
    return []
  }
}

export function addBookmark(entity) {
  const bookmarks = getBookmarks()
  if (bookmarks.some(b => b.id === entity.id)) return bookmarks
  const entry = {
    id: entity.id,
    schema: entity.schema,
    name: getEntityName(entity),
    addedAt: new Date().toISOString(),
    notes: '',
  }
  const updated = [...bookmarks, entry]
  localStorage.setItem(KEY, JSON.stringify(updated))
  return updated
}

export function removeBookmark(entityId) {
  const bookmarks = getBookmarks().filter(b => b.id !== entityId)
  localStorage.setItem(KEY, JSON.stringify(bookmarks))
  return bookmarks
}

export function updateBookmarkNotes(entityId, notes) {
  const bookmarks = getBookmarks().map(b =>
    b.id === entityId ? { ...b, notes } : b
  )
  localStorage.setItem(KEY, JSON.stringify(bookmarks))
  return bookmarks
}

export function isBookmarked(entityId) {
  return getBookmarks().some(b => b.id === entityId)
}
