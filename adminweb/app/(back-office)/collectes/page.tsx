export default function Page() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Collectes</h1>
        <p className="text-sm text-gray-500">Missions planifiees, en cours et terminees.</p>
      </div>
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-sm font-medium text-gray-700">Module a construire</p>
        <p className="mx-auto mt-2 max-w-md text-xs text-gray-500">
          L'endpoint /api/dashboard/collectes-en-cours est deja disponible cote API : il ne reste que l'interface a brancher.
        </p>
      </div>
    </div>
  );
}
