type TodayOverviewCardProps = {
  enabledCount: number;
  dueTodayCount: number;
  totalCount: number;
  scheduleMix: string;
  schedulerFact?: string | null;
};

export function TodayOverviewCard({
  enabledCount,
  dueTodayCount,
  totalCount,
  scheduleMix,
  schedulerFact,
}: TodayOverviewCardProps) {
  return (
    <section className="surface-card today-overview-card">
      <p className="app-shell__eyebrow">Today overview</p>
      <h2 className="card-heading">Keep the day light, visible, and steady.</h2>
      <p className="card-caption">A small snapshot of what is active today, without turning the app into a scoreboard.</p>

      <div className="overview-grid">
        <article className="overview-metric">
          <p className="overview-metric__value">{enabledCount}</p>
          <p className="overview-metric__label">Enabled</p>
        </article>
        <article className="overview-metric">
          <p className="overview-metric__value">{dueTodayCount}</p>
          <p className="overview-metric__label">Due today</p>
        </article>
      </div>

      <p className="section-copy">
        {totalCount === 0 ? "Nothing is scheduled yet." : `${totalCount} reminders in view · ${scheduleMix}`}
      </p>
      {schedulerFact ? <p className="today-overview-card__fact">App-wide timing: {schedulerFact}</p> : null}
    </section>
  );
}