# Dynamic Sheet Parser Plan

The parser is deferred and no Google API call exists in Phase 1.

## Workbook conventions, not fixed coordinates

- Each Department + Semester + Shift has a separate Spreadsheet.
- Each visible or hidden tab represents a subject; its title usually contains `subjectCode`.
- Metadata includes department, semester, shift, subject, and teacher.
- Student tables contain dynamically positioned Name, Shift, Roll, attendance-date, and summary
  columns.
- There is no fixed header row, column letter, or attendance starting cell.

## Detection pipeline

The future parser normalizes whitespace, casing, punctuation, aliases, and English/Bangla digits.
It accounts for merged cells, empty rows, hidden tabs, duplicate rolls, and malformed data. It
classifies date columns separately from summary columns and compares the tab subject code with the
metadata subject code.

Candidate structures receive confidence scores based on independent signals. Ambiguous structure
must never trigger a write. Instead, the service returns a typed validation error containing safe
diagnostics. The design must allow a future manual column-mapping fallback.

## Output and display

Parser output will be normalized, typed, and independent of Google cell coordinates where
possible. Subject labels shown in every UI must use:

```text
Subject Name (Subject Code)
```
