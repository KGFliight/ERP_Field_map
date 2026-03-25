import type { TrainingCard } from '@/types';

interface ScenarioCardsProps {
  cards: TrainingCard[];
}

function CardIcon({ category }: { category: string }) {
  const icons: Record<string, { path: string; color: string }> = {
    targets: {
      path: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      color: 'text-red-400',
    },
    friendlies: {
      path: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      color: 'text-green-400',
    },
    environmental: {
      path: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
      color: 'text-blue-400',
    },
  };

  const config = icons[category] || icons.environmental;

  return (
    <svg className={`w-5 h-5 ${config.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d={config.path} />
    </svg>
  );
}

function ScenarioCard({ card }: { card: TrainingCard }) {
  const bgColors: Record<string, string> = {
    targets: 'bg-red-500/10 border-red-500/30',
    friendlies: 'bg-green-500/10 border-green-500/30',
    environmental: 'bg-blue-500/10 border-blue-500/30',
  };

  return (
    <div className={`flex-1 p-3 rounded-lg border ${bgColors[card.category] || bgColors.environmental}`}>
      <div className="flex items-center gap-2 mb-1">
        <CardIcon category={card.category} />
        <span className="text-white font-medium text-sm truncate">{card.name}</span>
      </div>
      <p className="text-white/50 text-xs line-clamp-2">{card.description}</p>
      {card.minCount !== undefined && card.maxCount !== undefined && (
        <div className="mt-1 text-white/40 text-xs">
          {card.minCount}-{card.maxCount} units
        </div>
      )}
    </div>
  );
}

export function ScenarioCards({ cards }: ScenarioCardsProps) {
  if (cards.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <span className="text-amber-400 text-sm font-medium">Active Scenario Cards</span>
      </div>
      <div className="flex gap-2">
        {cards.map((card) => (
          <ScenarioCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}
