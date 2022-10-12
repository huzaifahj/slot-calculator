# Problems I had with other similar packages

- `from` and `to` inputs had to be discrete dates (can't specify exact times)
- Could not have custom schedules (specify exact datetimes rather than "Monday from 14:00 to 15:00")
- Weak timezone support: could not set timezones on a per availability basis
- Outputted slots did not have `to` property, just a `time`
- No TypeScript support (or even a declaration file)

# Things to remember

- Run `npm run docs` before committing.