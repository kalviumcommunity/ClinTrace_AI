# 3.47 streaming and citation sample

Endpoint: `POST http://localhost:5000/api/query/stream`

## Request

```json
{"query":"How long are signed consent records retained?","k":2}
```

## Progressive SSE output

```text
event: sources
data: {"results":[{"chunk_id":"<generated-id>-chunk-0","metadata":{"source_document":"sample-upload.txt","chunk_index":0},"text":"The clinic retains signed consent records for seven years."}]}

event: token
data: {"text":"[1] "}
event: token
data: {"text":"The "}
event: token
data: {"text":"clinic "}
event: token
data: {"text":"retains "}
event: token
data: {"text":"signed "}
event: token
data: {"text":"consent "}
event: token
data: {"text":"records "}
event: token
data: {"text":"for "}
event: token
data: {"text":"seven "}
event: token
data: {"text":"years. "}
event: done
data: {"answer":"[1] The clinic retains signed consent records for seven years. "}
```

The UI displays the answer progressively with a blinking cursor and labels the completed response `GROUNDED`. The `[1]` citation corresponds to an expandable source panel showing `sample-upload.txt`, its generated chunk ID, chunk index `0`, and the full retrieved passage.

If the connection ends before `done`, the UI keeps any received text and shows `The answer stream ended before the response was complete.` The question remains usable for retrying. Backend errors before streaming begins return JSON; errors after streaming begins are sent as an SSE `error` event.
