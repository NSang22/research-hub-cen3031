export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center">
                <span className="text-white text-sm font-bold">R</span>
              </div>
              <span className="text-xl font-bold text-gray-900">ResearchHub</span>
            </div>
            <nav className="flex items-center gap-4">
              <a href="#" className="text-sm text-gray-600 hover:text-gray-900">Browse</a>
              <a href="#" className="text-sm text-gray-600 hover:text-gray-900">For Professors</a>
              <button className="btn-secondary text-sm">Log in</button>
              <button className="btn-primary text-sm">Sign up</button>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Find your research{' '}
          <span className="text-primary-600">opportunity</span>
        </h1>
        <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
          ResearchHub connects undergraduate and graduate students with faculty-led
          research positions across your university. Discover labs, apply to projects,
          and launch your research career.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <button className="btn-primary px-8 py-3 text-base">
            Browse Positions
          </button>
          <button className="btn-secondary px-8 py-3 text-base">
            Post a Position
          </button>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {[
            { stat: '500+', label: 'Research Positions' },
            { stat: '120+', label: 'Faculty Members' },
            { stat: '40+', label: 'Departments' },
          ].map(({ stat, label }) => (
            <div key={label} className="card text-center">
              <p className="text-4xl font-bold text-primary-600">{stat}</p>
              <p className="mt-1 text-sm text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
