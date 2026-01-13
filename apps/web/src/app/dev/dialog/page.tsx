'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DialogDemoPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dialog accessibility demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          This playful page is only for development and testing. The dialog below demonstrates the
          focus trap and Escape-to-close behavior expected by the Radix Dialog primitives.
        </CardContent>
      </Card>

      <Dialog>
        <DialogTrigger asChild>
          <Button data-testid="dialog-trigger" size="sm">
            Open dialog
          </Button>
        </DialogTrigger>
        <DialogContent data-testid="dialog-content">
          <DialogHeader>
            <DialogTitle>Keyboard trap check</DialogTitle>
            <DialogDescription>
              Press Tab to cycle through the interactive elements and Escape to close the dialog.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input data-testid="dialog-input-1" placeholder="First field" autoFocus />
            <Input data-testid="dialog-input-2" placeholder="Second field" />
          </div>

          <DialogFooter className="justify-between">
            <Button type="button" variant="secondary">
              Secondary action
            </Button>
            <DialogClose asChild>
              <Button variant="ghost" size="sm">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
