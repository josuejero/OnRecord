import { uploadAsset } from './actions';

export function AssetUploadPanel(props: { sessionId: string; revalidatePath: string }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Upload an image or document to attach to this session’s recap or assets shelf. Files land in
        the private bucket (visible to editors only).
      </p>

      <form
        className="space-y-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
        action={uploadAsset}
      >
        <input type="hidden" name="session_id" value={props.sessionId} />
        <input type="hidden" name="revalidate_path" value={props.revalidatePath} />

        <div className="space-y-2 text-sm">
          <label className="block text-xs uppercase tracking-[0.3em] text-slate-400">
            Visibility
          </label>
          <select
            name="visibility"
            defaultValue="public"
            data-testid="asset-visibility"
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>

        <div className="space-y-2 text-sm">
          <label className="block text-xs uppercase tracking-[0.3em] text-slate-400">File</label>
          <input
            name="file"
            type="file"
            className="w-full rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
            data-testid="asset-file"
            required
          />
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none hover:bg-primary/90"
          data-testid="asset-submit"
        >
          Upload asset
        </button>
      </form>

      <p className="text-xs text-slate-500">Accepted: image/pdf/txt. Max 25MB per file.</p>
    </div>
  );
}
