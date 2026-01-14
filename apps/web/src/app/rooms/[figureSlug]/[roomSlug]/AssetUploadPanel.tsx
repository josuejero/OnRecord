import { uploadAsset } from './actions';

export function AssetUploadPanel(props: {
  sessionId: string;
  revalidatePath: string;
}) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Upload an image or document to attach to this session.
      </p>

      <form className="mt-4 flex flex-col gap-3" action={uploadAsset}>
        <input type="hidden" name="session_id" value={props.sessionId} />
        <input type="hidden" name="revalidate_path" value={props.revalidatePath} />

        <label className="text-sm font-medium">Visibility</label>
        <select
          name="visibility"
          defaultValue="public"
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>

        <label className="text-sm font-medium">File</label>
        <input
          name="file"
          type="file"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          required
        />

        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          Upload
        </button>
      </form>
    </div>
  );
}
