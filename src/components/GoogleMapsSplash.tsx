
export default function GoogleMapsSplash() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
      <div className="max-w-lg bg-white p-12 rounded-[40px] shadow-2xl border border-[#141414]/5">
        <h2 className="text-4xl font-serif italic tracking-tighter mb-4">Google Maps API Key Required</h2>
        <p className="text-[#141414]/60 mb-8 leading-relaxed">
          To enable the interactive world map and place discovery, please provide a Google Maps Platform API Key.
        </p>
        
        <div className="space-y-6 text-left">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-[#f5f5f0] flex-shrink-0 flex items-center justify-center font-bold text-xs">1</div>
            <p className="text-sm">
              <a href="https://console.cloud.google.com/google/maps-apis/start" target="_blank" rel="noopener" className="underline font-bold">Get an API Key</a> from Google Cloud Console.
            </p>
          </div>
          
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-[#f5f5f0] flex-shrink-0 flex items-center justify-center font-bold text-xs">2</div>
            <p className="text-sm">
              Add your key as a secret in <strong>Settings</strong> &rarr; <strong>Secrets</strong> with the name <code>GOOGLE_MAPS_PLATFORM_KEY</code>.
            </p>
          </div>
        </div>

        <p className="mt-12 text-[10px] uppercase tracking-widest opacity-40 font-bold">
          The app will rebuild automatically once the key is added.
        </p>
      </div>
    </div>
  );
}
