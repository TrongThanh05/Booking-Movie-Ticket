import PageMeta from "../../components/common/PageMeta";

export default function Home() {
  return (
    <>
      <PageMeta
        title="Admin Dashboard | Movie Booking System"
        description="Admin Dashboard for Movie Booking System"
      />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              🎬 Movie Booking Admin Dashboard
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Dashboard đang được xây dựng. Các module quản lý sẽ được thêm vào
              sau.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}