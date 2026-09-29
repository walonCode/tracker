// Fix the timezone for every test run so date tests are reproducible.
// New York has a non-zero UTC offset and DST transitions.
module.exports = async () => {
  process.env.TZ = "America/New_York";
};
