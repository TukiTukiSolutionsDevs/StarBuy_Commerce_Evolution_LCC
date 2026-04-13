export default function CartLoading() {
  return (
    <div className="min-h-screen bg-[#faf9f6] animate-pulse">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2 mb-6">
          <div className="h-4 w-12 rounded bg-[#eeeeea]" />
          <div className="h-4 w-4 rounded bg-[#eeeeea]" />
          <div className="h-4 w-24 rounded bg-[#eeeeea]" />
        </div>

        {/* Title skeleton */}
        <div className="h-9 w-64 rounded-lg bg-[#eeeeea] mb-8" />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Cart items skeleton */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-[#ffffff] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-5 p-6 border-b border-[#eeeeea] last:border-b-0">
                  <div className="h-24 w-24 flex-shrink-0 rounded-xl bg-[#f4f4f0]" />
                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between">
                      <div className="space-y-2">
                        <div className="h-5 w-40 rounded bg-[#f4f4f0]" />
                        <div className="h-4 w-24 rounded bg-[#f4f4f0]" />
                      </div>
                      <div className="h-5 w-16 rounded bg-[#f4f4f0]" />
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <div className="h-8 w-24 rounded-lg bg-[#f4f4f0]" />
                      <div className="h-4 w-16 rounded bg-[#f4f4f0]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order summary skeleton */}
          <div>
            <div className="rounded-2xl bg-[#ffffff] p-6 space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
              <div className="h-6 w-32 rounded bg-[#f4f4f0]" />
              <div className="space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 w-16 rounded bg-[#f4f4f0]" />
                  <div className="h-4 w-12 rounded bg-[#f4f4f0]" />
                </div>
                <div className="flex justify-between">
                  <div className="h-4 w-16 rounded bg-[#f4f4f0]" />
                  <div className="h-4 w-28 rounded bg-[#f4f4f0]" />
                </div>
              </div>
              <div className="border-t border-[#eeeeea] pt-4">
                <div className="flex justify-between">
                  <div className="h-5 w-12 rounded bg-[#f4f4f0]" />
                  <div className="h-6 w-20 rounded bg-[#f4f4f0]" />
                </div>
              </div>
              <div className="h-12 w-full rounded-lg bg-[#f4f4f0] mt-4" />
              <div className="h-4 w-48 rounded bg-[#f4f4f0] mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
