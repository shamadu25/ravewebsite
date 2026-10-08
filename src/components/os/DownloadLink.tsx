/** File download (CSV export). A plain anchor is correct here: it is a file response, not a page navigation. */
export default function DownloadLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} download className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-50">
      {children}
    </a>
  );
}
