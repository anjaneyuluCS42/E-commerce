
export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="relative">
        <div className="w-14 h-14 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-blue-600 opacity-20 animate-ping" />
        </div>
      </div>
      <p className="text-gray-500 text-sm font-semibold animate-pulse">{message}</p>
    </div>
  );
}
