# 3.46 sample interaction

The frontend runs with `npm run dev` in `frontend/` and calls `POST http://localhost:5000/api/query`.

## Question

> How long are signed consent records retained?

## Answer shown in the UI

> The clinic retains signed consent records for seven years. Patients may request a copy of their retained record through the records desk.

## Sources shown beside the answer

- `sample-upload.txt`
- `chunk_id: <generated Chroma chunk id>`
- `Chunk 0`
- `The clinic retains signed consent records for seven years.`

## Loading and error states

While the request is running, the answer panel shows `Searching the live corpus` and disables the question field and submit button. If the backend is unavailable or returns an error, the panel shows `Could not retrieve an answer`, the API message, and a dismiss action.
