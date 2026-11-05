import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CannedRepliesEditor from "@/components/os/CannedRepliesEditor";
import { listCannedReplies } from "@/lib/os/cannedStore";

export const dynamic = "force-dynamic";

export default async function CannedRepliesPage() {
  const { replies, usingDefaults } = await listCannedReplies();
  // Editable rows only exist once the team has their own set; the defaults are shown read-only until copied.
  const rows = usingDefaults ? [] : await prisma.cannedReply.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true, title: true, body: true } });

  return (
    <div className="max-w-3xl">
      <Link href="/admin/conversations" className="text-sm text-blue-600 hover:underline">← Back to live chats</Link>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">Canned replies</h1>
      <p className="mb-6 mt-1 text-sm text-gray-500">
        One-click replies in the chat reply box. Write <code className="rounded bg-gray-100 px-1">{"{name}"}</code> where the visitor&apos;s first name should go; it is dropped when the name is unknown.
      </p>

      {usingDefaults && (
        <ul className="mb-6 space-y-2">
          {replies.map((r) => (
            <li key={r.key} className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-gray-900">{r.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{r.body}</p>
            </li>
          ))}
        </ul>
      )}

      <CannedRepliesEditor rows={rows} usingDefaults={usingDefaults} />
    </div>
  );
}
