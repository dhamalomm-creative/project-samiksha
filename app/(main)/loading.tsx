export default function Loading() {
  return (
    <div aria-busy aria-label="Loading" className="animate-pulse">
      <div className="mb-6 h-10 w-48 rounded-xl bg-sand" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="aspect-[4/5] rounded-2xl bg-sand" />
        ))}
      </div>
    </div>
  );
}
