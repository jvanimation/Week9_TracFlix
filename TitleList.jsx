import { useState, useEffect, useRef } from 'react'

// Like useState, but loads its initial value from localStorage
// and writes every change back to it.
function usePersistentState(key, initialValue) {
    const [value, setValue] = useState(() => {
        try {
            const saved = localStorage.getItem(key)
            return saved !== null ? JSON.parse(saved) : initialValue
        } catch {
            return initialValue
        }
    })

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(value))
        } catch {
            // storage unavailable or full; ignore
        }
    }, [key, value])

    return [value, setValue]
}

// ---------------------------------------------------------------------------
// TVmaze API (https://www.tvmaze.com/api)
// Free, no API key, CORS-enabled. Limit is roughly 20 calls per 10 seconds.
// ---------------------------------------------------------------------------
const TVMAZE = 'https://api.tvmaze.com'

// Cached for the life of the page so the same show/episode is never fetched
// twice (this also keeps us well under the rate limit).
const showCache = new Map() // lowercase title -> Promise<show | null>
const episodeCache = new Map() // "showId-season-episode" -> Promise<episode | null>

// Returns parsed JSON, null for a 404 (not found), and throws for anything else.
async function fetchJson(url) {
    const res = await fetch(url)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`TVmaze responded with ${res.status}`)
    return res.json()
}

// Cache the promise, but drop failed lookups so they can be retried.
function cached(cache, key, load) {
    if (!cache.has(key)) {
        const promise = load()
        cache.set(key, promise)
        promise.catch(() => cache.delete(key))
    }
    return cache.get(key)
}

// Best single match for a show title.
function findShow(title) {
    return cached(showCache, title.trim().toLowerCase(), () =>
        fetchJson(`${TVMAZE}/singlesearch/shows?q=${encodeURIComponent(title)}`)
    )
}

function findEpisode(showId, season, episode) {
    return cached(episodeCache, `${showId}-${season}-${episode}`, () =>
        fetchJson(
            `${TVMAZE}/shows/${showId}/episodebynumber?season=${season}&number=${episode}`
        )
    )
}

// TVmaze summaries come back as HTML (e.g. "<p>Text</p>"). Read the text
// out instead of injecting the markup into the page.
function htmlToText(html) {
    if (!html) return ''
    const doc = new DOMParser().parseFromString(html, 'text/html')
    return (doc.body.textContent || '').trim()
}

// Looks up one episode's details. Waits briefly after the title, season or
// episode changes so typing "12" doesn't fire a request for "1" first.
// Bump `retryKey` to try again after an error.
function useEpisodeInfo(title, season, episode, retryKey) {
    const [state, setState] = useState({ status: 'loading' })

    useEffect(() => {
        let cancelled = false
        setState({ status: 'loading' })

        const timer = setTimeout(async () => {
            try {
                const show = await findShow(title)
                if (!show) {
                    if (!cancelled) setState({ status: 'no-show' })
                    return
                }
                const ep = await findEpisode(show.id, season, episode)
                if (cancelled) return
                setState(
                    ep
                        ? { status: 'ok', show, episode: ep }
                        : { status: 'no-episode', show }
                )
            } catch {
                if (!cancelled) setState({ status: 'error' })
            }
        }, 500)

        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [title, season, episode, retryKey])

    return state
}

function EpisodeInfo({ title, season, episode }) {
    const [retryKey, setRetryKey] = useState(0)
    const info = useEpisodeInfo(title, season, episode, retryKey)

    let content
    switch (info.status) {
        case 'loading':
            content = <p className="episode-note">Looking up episode…</p>
            break
        case 'no-show':
            content = (
                <p className="episode-note">
                    No show named "{title}" found on TVmaze. Try editing the title.
                </p>
            )
            break
        case 'no-episode':
            content = (
                <p className="episode-note">
                    TVmaze has no season {season}, episode {episode} for{' '}
                    {info.show.name}.
                </p>
            )
            break
        case 'error':
            content = (
                <p className="episode-note">
                    Couldn't reach TVmaze.{' '}
                    <button type="button" onClick={() => setRetryKey((k) => k + 1)}>
                        Retry
                    </button>
                </p>
            )
            break
        default: {
            const { episode: ep } = info
            const summary = htmlToText(ep.summary)
            content = (
                <>
                    <p className="episode-name">
                        <a href={ep.url} target="_blank" rel="noreferrer">
                            {ep.name}
                        </a>
                        {ep.airdate && (
                            <span className="episode-airdate"> (aired {ep.airdate})</span>
                        )}
                    </p>
                    <p className="episode-summary">
                        {summary || 'No description available for this episode yet.'}
                    </p>
                </>
            )
        }
    }

    return (
        <div className="episode-info" aria-live="polite">
            {content}
        </div>
    )
}

// Turns whatever was typed into a whole number of at least 1.
const toPositiveInt = (value) => Math.max(1, parseInt(value, 10) || 1)

// Like toPositiveInt, but a blank or invalid entry means "unknown" (null).
const toOptionalPositiveInt = (value) => {
    const n = parseInt(value, 10)
    return Number.isNaN(n) ? null : Math.max(1, n)
}

// Suggestions only; any platform name can still be typed in.
const PLATFORMS = [
    'Netflix',
    'Hulu',
    'Disney+',
    'HBOMax',
    'Prime Video',
    'Apple TV+',
    'Paramount+',
    'Peacock',
    'Crunchyroll',
    'YouTube',
    'Tubi',
    'Other',
]

function TitleList() {
    const [items, setItems] = usePersistentState('tracflix-titles', [])
    const [text, setText] = usePersistentState('tracflix-draft-title', '')

    // Which item's title is being edited (null = none) and its working text.
    const [editingId, setEditingId] = useState(null)
    const [editText, setEditText] = useState('')
    // Set when Escape cancels, so the blur that follows doesn't save.
    const cancelledRef = useRef(false)

    const startEditing = (item) => {
        cancelledRef.current = false
        setEditingId(item.id)
        setEditText(item.title)
    }

    const commitEdit = (id) => {
        if (cancelledRef.current) return
        const trimmed = editText.trim()
        // A blank title isn't allowed; keep the old one.
        if (trimmed) {
            setItems(
                items.map((item) =>
                    item.id === id ? { ...item, title: trimmed } : item
                )
            )
        }
        setEditingId(null)
    }

    const cancelEdit = () => {
        cancelledRef.current = true
        setEditingId(null)
    }

    const handleAdd = (e) => {
        e.preventDefault()
        const trimmed = text.trim()
        if (!trimmed) return
        setItems([
            ...items,
            {
                id: crypto.randomUUID(),
                title: trimmed,
                platform: '',
                season: 1,
                episode: 1,
                totalEpisodes: null,
            },
        ])
        setText('')
    }

    // Drag-to-reorder. `dragId` is the item being dragged; `dropTarget` is the
    // item it is hovering over and whether it would land before or after it.
    const [dragId, setDragId] = useState(null)
    const [dropTarget, setDropTarget] = useState(null) // { id, after }

    const moveItem = (id, targetId, after) => {
        if (id === targetId) return
        const moving = items.find((item) => item.id === id)
        if (!moving) return
        const rest = items.filter((item) => item.id !== id)
        const targetIndex = rest.findIndex((item) => item.id === targetId)
        if (targetIndex === -1) return
        rest.splice(after ? targetIndex + 1 : targetIndex, 0, moving)
        setItems(rest)
    }

    const endDrag = () => {
        setDragId(null)
        setDropTarget(null)
    }

    // Keyboard alternative: arrow keys on the handle move the item one step.
    const handleHandleKeyDown = (e, index) => {
        const target = e.key === 'ArrowUp' ? index - 1 : e.key === 'ArrowDown' ? index + 1 : null
        if (target === null || target < 0 || target >= items.length) return
        e.preventDefault()
        const next = [...items]
            ;[next[index], next[target]] = [next[target], next[index]]
        setItems(next)
    }

    const handleRemove = (id) => {
        setItems(items.filter((item) => item.id !== id))
    }

    // field is 'season' or 'episode'
    const handleNumberChange = (id, field, value) => {
        setItems(
            items.map((item) =>
                item.id === id ? { ...item, [field]: toPositiveInt(value) } : item
            )
        )
    }

    // Blank means the total is unknown, so it is stored as null.
    const handleTotalChange = (id, value) => {
        setItems(
            items.map((item) =>
                item.id === id
                    ? { ...item, totalEpisodes: toOptionalPositiveInt(value) }
                    : item
            )
        )
    }

    const handlePlatformChange = (id, value) => {
        setItems(
            items.map((item) =>
                item.id === id ? { ...item, platform: value } : item
            )
        )
    }

    return (
        <div className="title-list">
            <style>{`
                .title-list,
                .title-list input,
                .title-list button {
                    text-align: center;
                }
                .title-form,
                .title-list li {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }
                .title-list ul {
                    list-style: none;
                    padding: 0;
                    max-width: 40rem;
                    margin: 1.5rem auto 0;
                }
                .title-list li {
                    gap: 0.5rem 0.75rem;
                    padding: 1rem 0;
                    border-bottom: 1px solid rgba(128, 128, 128, 0.3);
                }
                .title-list li:last-child {
                    border-bottom: none;
                }
                /* Title gets a full row to itself so it never gets squeezed */
                .title-list .item-title {
                    flex: 1 1 100%;
                    font-size: 1.15rem;
                    font-weight: 600;
                    overflow-wrap: anywhere;
                }
                .title-list .item-title-button {
                    background: none;
                    border: none;
                    padding: 0.1rem 0.4rem;
                    font: inherit;
                    color: inherit;
                    cursor: text;
                    border-radius: 4px;
                }
                .title-list .item-title-button:hover,
                .title-list .item-title-button:focus-visible {
                    background: rgba(128, 128, 128, 0.15);
                }
                .title-list .drag-handle {
                    display: inline-block;
                    padding: 0 0.5rem;
                    cursor: grab;
                    user-select: none;
                    opacity: 0.5;
                    border-radius: 4px;
                }
                .title-list .drag-handle:hover,
                .title-list .drag-handle:focus-visible {
                    opacity: 1;
                    background: rgba(128, 128, 128, 0.15);
                }
                .title-list .drag-handle:active {
                    cursor: grabbing;
                }
                .title-list li.dragging {
                    opacity: 0.4;
                }
                .title-list li.drop-before {
                    box-shadow: 0 -2px 0 0 #646cff;
                }
                .title-list li.drop-after {
                    box-shadow: 0 2px 0 0 #646cff;
                }
                .title-list .title-edit-input {
                    font: inherit;
                    width: 100%;
                    max-width: 24rem;
                }
                .title-list .platform-input {
                    width: 9rem;
                }
                .title-list .episode-input {
                    width: 3.5rem;
                    margin-left: 0.25rem;
                }
                /* Episode description gets its own full row under the controls */
                .title-list .episode-info {
                    flex: 1 1 100%;
                    max-width: 34rem;
                    margin: 0.25rem auto 0;
                    line-height: 1.5;
                }
                .title-list .episode-info p {
                    margin: 0.2rem 0;
                }
                .title-list .episode-name {
                    font-weight: 600;
                }
                .title-list .episode-name a {
                    color: inherit;
                }
                .title-list .episode-airdate,
                .title-list .episode-note {
                    font-size: 0.9rem;
                    opacity: 0.7;
                }
                .title-list .episode-summary {
                    font-size: 0.95rem;
                }
                .title-list .tvmaze-credit {
                    margin-top: 1.5rem;
                    font-size: 0.8rem;
                    opacity: 0.7;
                }
                .title-list .tvmaze-credit a {
                    color: inherit;
                }
            `}</style>

            <datalist id="platform-options">
                {PLATFORMS.map((name) => (
                    <option key={name} value={name} />
                ))}
            </datalist>

            <form className="title-form" onSubmit={handleAdd}>
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Add a title..."
                />
                <button type="submit" disabled={!text.trim()}>Add</button>
            </form>

            {items.length === 0 ? (
                <p className="empty">Nothing here yet.</p>
            ) : (
                <ul>
                    {items.map((item, index) => (
                        <li
                            key={item.id}
                            className={[
                                dragId === item.id ? 'dragging' : '',
                                dropTarget?.id === item.id
                                    ? dropTarget.after
                                        ? 'drop-after'
                                        : 'drop-before'
                                    : '',
                            ].join(' ')}
                            onDragOver={(e) => {
                                if (!dragId) return
                                e.preventDefault()
                                const rect = e.currentTarget.getBoundingClientRect()
                                const after = e.clientY > rect.top + rect.height / 2
                                if (dropTarget?.id !== item.id || dropTarget.after !== after) {
                                    setDropTarget({ id: item.id, after })
                                }
                            }}
                            onDrop={(e) => {
                                if (!dragId) return
                                e.preventDefault()
                                moveItem(dragId, item.id, dropTarget?.after ?? false)
                                endDrag()
                            }}
                        >
                            <span className="item-title">
                                <span
                                    className="drag-handle"
                                    draggable
                                    tabIndex={0}
                                    role="button"
                                    aria-label={`Reorder ${item.title}. Use up and down arrow keys.`}
                                    title="Drag to reorder"
                                    onDragStart={(e) => {
                                        const li = e.currentTarget.closest('li')
                                        e.dataTransfer.effectAllowed = 'move'
                                        e.dataTransfer.setData('text/plain', item.id)
                                        if (li) e.dataTransfer.setDragImage(li, 20, 20)
                                        setDragId(item.id)
                                    }}
                                    onDragEnd={endDrag}
                                    onKeyDown={(e) => handleHandleKeyDown(e, index)}
                                >
                                    ⠿
                                </span>
                                {editingId === item.id ? (
                                    <input
                                        className="title-edit-input"
                                        type="text"
                                        value={editText}
                                        autoFocus
                                        onFocus={(e) => e.target.select()}
                                        onChange={(e) => setEditText(e.target.value)}
                                        onBlur={() => commitEdit(item.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') commitEdit(item.id)
                                            if (e.key === 'Escape') cancelEdit()
                                        }}
                                        aria-label={`Edit title ${item.title}`}
                                    />
                                ) : (
                                    <button
                                        type="button"
                                        className="item-title-button"
                                        onClick={() => startEditing(item)}
                                        title="Click to edit title"
                                    >
                                        {item.title}
                                    </button>
                                )}
                            </span>
                            <input
                                className="platform-input"
                                type="text"
                                list="platform-options"
                                value={item.platform ?? ''}
                                onChange={(e) => handlePlatformChange(item.id, e.target.value)}
                                placeholder="Platform"
                                aria-label={`Streaming platform for ${item.title}`}
                                title="Streaming platform"
                            />
                            <label className="item-episode">
                                S
                                <input
                                    className="episode-input"
                                    type="number"
                                    min="1"
                                    value={item.season ?? 1}
                                    onChange={(e) => handleNumberChange(item.id, 'season', e.target.value)}
                                />
                            </label>
                            <label className="item-episode">
                                Ep
                                <input
                                    className="episode-input"
                                    type="number"
                                    min="1"
                                    value={item.episode}
                                    onChange={(e) => handleNumberChange(item.id, 'episode', e.target.value)}
                                />
                            </label>
                            <label className="item-episode">
                                of
                                <input
                                    className="episode-input"
                                    type="number"
                                    min="1"
                                    value={item.totalEpisodes ?? ''}
                                    onChange={(e) => handleTotalChange(item.id, e.target.value)}
                                    placeholder="?"
                                    title="Total episodes in the season"
                                />
                            </label>
                            <button onClick={() => handleRemove(item.id)}>X</button>
                            <EpisodeInfo
                                title={item.title}
                                season={item.season ?? 1}
                                episode={item.episode}
                            />
                        </li>
                    ))}
                </ul>
            )}

            {items.length > 0 && (
                <p className="tvmaze-credit">
                    Episode data from{' '}
                    <a href="https://www.tvmaze.com/" target="_blank" rel="noreferrer">
                        TVmaze.com
                    </a>
                </p>
            )}
        </div>
    )
}

export default TitleList