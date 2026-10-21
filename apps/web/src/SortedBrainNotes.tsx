import { useMemo, useState, type ReactNode } from "react";
import type { Note } from "@sorta/contracts";
import { groupImportedOriginals, importedSourceLocation, isAutomaticSourceNote } from "./brain-note-groups";
import "./note-sorting.css";

export function sortedNoteGroups(notes: Note[]) {
  const byName = new Map<string, { name: string; notes: Note[] }>();
  for (const note of notes) {
    const organization = note.automaticOrganization?.sourceRevision === note.revision ? note.automaticOrganization : null;
    const name = organization?.subject ?? (organization?.origin === "ai" ? organization.topic : null)
      ?? (isAutomaticSourceNote(note) ? "Other files and conversations" : "Your notes");
    const key = name.toLocaleLowerCase("nb-NO");
    const group = byName.get(key) ?? { name, notes: [] };
    group.notes.push(note);
    byName.set(key, group);
  }
  return [...byName.values()].sort((a, b) => {
    const priority = (name: string) => name === "Your notes" ? 0 : name === "Other files and conversations" ? 2 : 1;
    return priority(a.name) - priority(b.name) || a.name.localeCompare(b.name, "nb-NO");
  });
}

export function SortedBrainNotes({ notes, loading, incomplete, renderNote }: {
  notes: Note[]; loading: boolean; incomplete: boolean; renderNote: (note: Note) => ReactNode;
}) {
  const [search, setSearch] = useState("");
  const groups = useMemo(() => sortedNoteGroups(notes.filter(note => !search.trim() ||
    `${note.title}\n${note.body}\n${note.automaticOrganization?.subject ?? ""}\n${note.automaticOrganization?.topic ?? ""}`.toLocaleLowerCase("nb-NO").includes(search.trim().toLocaleLowerCase("nb-NO"))
  )), [notes, search]);
  return <div className="sorted-brain">
    <label className="brain-find">Find a note or file
      <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Subject, title or words in the note"/>
    </label>
    <p className="sorting-explanation">Class groups use recorded source information. AI suggestions stay separate from your original notes.</p>
    {notes.some(note => note.body.trim() && !note.classificationLocked && note.classifiedRevision !== note.revision) && <p className="sorting-explanation">AI classification is pending for some notes. Class groups work without it.</p>}
    {loading && <p role="status">Loading all saved notes…</p>}
    {incomplete && <p className="pending-banner" role="status">Could not load all notes. Only the records loaded so far are shown. Reload to try again.</p>}
    {!loading && !incomplete && groups.length === 0 && <p role="status">{search.trim() ? "No notes match. Try another word." : "No saved notes yet. Capture a thought or drop files in the Inbox."}</p>}
    <div className="brain-class-groups">{groups.map(group => {
      const originals = groupImportedOriginals(group.notes.map(note => isAutomaticSourceNote(note) ? note : { ...note, originalSha256: null }));
      return <details className="brain-class-group" key={group.name} open={search.trim() ? true : undefined}>
        <summary><span>{group.name}</span><span className="brain-group-count">{originals.length} {originals.length === 1 ? "item" : "items"}</span></summary>
        <div className="brain-group-content">
          <div className="notes-grid">{originals.map(original => {
            const primary = original.find(note => !importedSourceLocation(note).includes("/Posts/")) ?? original[0];
            return <div className="brain-material" key={primary.id}>
              {primary.automaticOrganization?.topic && <p className="brain-topic">{primary.automaticOrganization.topic}{primary.automaticOrganization.origin === "ai" ? " (AI suggestion)" : ""}</p>}
              {primary.automaticOrganization?.origin === "ai" && !primary.automaticOrganization.topic && <p className="brain-topic">AI subject suggestion</p>}
              {renderNote(primary)}
              {original.length > 1 && <details className="brain-material-sources">
                <summary>{original.length} source locations</summary>
                <ul>{original.map(note => <li key={note.id}><p className="brain-source-path">{importedSourceLocation(note)}</p>{renderNote(note)}</li>)}</ul>
              </details>}
            </div>;
          })}</div>
        </div>
      </details>;
    })}</div>
  </div>;
}
