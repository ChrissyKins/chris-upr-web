const RELEASES = [
  {
    version: 'v1.1.0',
    date: 'April 6, 2026',
    downloadUrl: 'https://github.com/ChrissyKins/chris-upr/releases/download/v1.1.0/ChrisUPR.zip',
    changelog: [
      'Custom TM moves, move tutors, in-game trades, shop items, field items',
      'Custom learnsets, Pokemon stats/types, and evolutions',
      'Trainer held items and custom movesets',
    ],
  },
  {
    version: 'v1.0.0',
    date: 'March 31, 2026',
    downloadUrl: 'https://github.com/ChrissyKins/chris-upr/releases/download/v1.0.0/ChrisUPR.zip',
    changelog: [
      'Initial release - supports customising encounters/trainers for Pokemon Crystal',
    ],
  },
];

export default function DownloadsPage() {
  return (
    <div>
      <hr />
      {RELEASES.map((release) => (
        <div key={release.version} style={{ marginBottom: 20 }}>
          <h3>Custom Pokemon Randomizer {release.version}</h3>
          <div style={{ fontSize: '0.9em', color: '#555', marginBottom: 4 }}>{release.date}</div>
          <div style={{ marginBottom: 8 }}>
            <a href={release.downloadUrl}>[Download]</a>
          </div>
          <div>
            <b>Changelog:</b>
            <ul style={{ marginTop: 4 }}>
              {release.changelog.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
          <hr />
        </div>
      ))}
    </div>
  );
}
