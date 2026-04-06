const EXPECTED_LIFECYCLE = ['SEEDING', 'WATERING', 'FERTILIZER', 'HARVEST'];
const GAP_THRESHOLD_DAYS = 7;
const MS_IN_DAY = 24 * 60 * 60 * 1000;

const toLabel = (value) => String(value || '').toLowerCase();

const parseTimestamp = (activity) => {
  const raw = activity?.timestamp ?? activity?.date ?? activity?.createdAt;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : null;
};

const normalizeType = (activity) => {
  return String(activity?.type ?? activity?.activityType ?? '')
    .trim()
    .toUpperCase();
};

export function analyzeTimeline(activities) {
  if (!Array.isArray(activities) || activities.length === 0) {
    return [];
  }

  const warnings = [];
  const seenMessages = new Set();

  const pushWarning = (type, message) => {
    if (!seenMessages.has(message)) {
      seenMessages.add(message);
      warnings.push({ type, message });
    }
  };

  const normalized = activities
    .map((activity) => ({
      type: normalizeType(activity),
      timestamp: parseTimestamp(activity)
    }))
    .filter((activity) => activity.type);

  if (normalized.length === 0) {
    return [];
  }

  // Out-of-order check uses the original input order to detect tampering in submitted timeline order.
  const originalWithTime = normalized.filter((activity) => activity.timestamp !== null);
  for (let i = 1; i < originalWithTime.length; i += 1) {
    if (originalWithTime[i].timestamp < originalWithTime[i - 1].timestamp) {
      pushWarning('order', 'Timeline contains out-of-order activity timestamps');
      break;
    }
  }

  const sorted = [...normalized].sort((a, b) => {
    if (a.timestamp === null && b.timestamp === null) return 0;
    if (a.timestamp === null) return 1;
    if (b.timestamp === null) return -1;
    return a.timestamp - b.timestamp;
  });

  const sortedWithTime = sorted.filter((activity) => activity.timestamp !== null);
  for (let i = 1; i < sortedWithTime.length; i += 1) {
    const prev = sortedWithTime[i - 1];
    const curr = sortedWithTime[i];
    const gapDays = Math.floor((curr.timestamp - prev.timestamp) / MS_IN_DAY);
    if (gapDays > GAP_THRESHOLD_DAYS) {
      pushWarning(
        'gap',
        `Gap of ${gapDays} days between ${toLabel(prev.type)} and ${toLabel(curr.type)}`
      );
    }
  }

  const typesPresent = new Set(sorted.map((activity) => activity.type));

  if (typesPresent.has('HARVEST') && !typesPresent.has('SEEDING')) {
    pushWarning('missing', 'Harvest activity exists without prior seeding activity');
  }

  if (typesPresent.has('SEEDING') && typesPresent.has('HARVEST')) {
    const seedingIndex = sorted.findIndex((activity) => activity.type === 'SEEDING');
    const harvestIndex = sorted.findIndex(
      (activity, index) => index > seedingIndex && activity.type === 'HARVEST'
    );

    if (seedingIndex >= 0 && harvestIndex > seedingIndex) {
      const betweenTypes = new Set(
        sorted.slice(seedingIndex + 1, harvestIndex).map((activity) => activity.type)
      );

      EXPECTED_LIFECYCLE.slice(1, 3).forEach((expectedType) => {
        if (!betweenTypes.has(expectedType)) {
          pushWarning('missing', `Missing ${toLabel(expectedType)} activity before harvest`);
        }
      });
    }
  }

  return warnings;
}
