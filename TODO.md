# Workflow

## Prep

*  verify game server is up and available
*  subscribe to match table

If either fails, then initiate retry. On 5 failures, exit with an error.

## Once ready

*  On new notification, attempt to claim match by updating status in db to playing
  1.  Retry on failure
  2.  Give up if match is no longer queued
*  Locally update match to starting

## Match in possession

### Match prep

*  Pull each team's docker image
*  Update locally to in_progress

### Play Match

*  Run image with correct session id for each client
*  Write logs locally (or in memory) and then submit them to log store
*  Update locally to ending

### Match completed

*  Query game server for outcome of the match
*  Update db status, gamelog_url, win reason, lose reason, and winner
*  Update locally to completed

## Cleanup

*  Immediately kill active match
*  Update db