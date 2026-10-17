import { useState } from 'react';
import { Bookmark, Check, Plus, Trash2, Settings } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from '../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { useDataTableStore, TableSettings } from './table-store';
const EMPTY_ARRAY: any[] = [];

export interface SavedViewsMenuProps {
  storageKey: string;
  currentTableSettings: Partial<TableSettings>;
  currentFilterValues?: Record<string, unknown>;
  onApplyView: (settings: Partial<TableSettings>, filterValues?: Record<string, unknown>) => void;
}

/**
 * 保存済みビュー（お気に入り）を選択・管理するためのメニュー。
 *
 * フィルター、ソート、列の表示設定などを名前を付けて保存し、
 * ワンクリックでそれらの設定を復元できます。
 *
 * @example
 * ```tsx
 * <SavedViewsMenu
 *   storageKey="user-table"
 *   currentTableSettings={settings}
 *   onApplyView={applyView}
 * />
 * ```
 */
export function SavedViewsMenu({
  storageKey,
  currentTableSettings,
  currentFilterValues,
  onApplyView,
}: SavedViewsMenuProps) {
  const savedViews = useDataTableStore((state) => state.savedViews[storageKey] || EMPTY_ARRAY);
  const activeViewId = useDataTableStore((state) => state.activeViewIds[storageKey]);
  const saveView = useDataTableStore((state) => state.saveView);
  const updateView = useDataTableStore((state) => state.updateView);
  const deleteView = useDataTableStore((state) => state.deleteView);
  const setActiveView = useDataTableStore((state) => state.setActiveView);

  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');

  const handleSaveNewView = () => {
    if (!newViewName.trim()) return;
    saveView(storageKey, newViewName.trim(), currentTableSettings, currentFilterValues);
    setNewViewName('');
    setIsSaveDialogOpen(false);
  };

  const handleApplyView = (viewId: string) => {
    const view = savedViews.find((v) => v.id === viewId);
    if (view) {
      onApplyView(view.settings, view.filterValues);
      setActiveView(storageKey, viewId);
    }
  };

  const handleUpdateActiveView = () => {
    if (!activeViewId) return;
    updateView(storageKey, activeViewId, currentTableSettings, currentFilterValues);
  };

  const handleClearActiveView = () => {
    setActiveView(storageKey, null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant='outline' size='sm' className='h-8 border-dashed flex items-center gap-1'>
            <Bookmark className='h-4 w-4' />
            <span>ビュー</span>
            {activeViewId && <span className='ml-1 flex h-2 w-2 rounded-full bg-primary' />}
          </Button>} />
        <DropdownMenuContent align='end' className='w-56'>
          <DropdownMenuLabel>保存済みビュー</DropdownMenuLabel>

          {savedViews.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              {savedViews.map((view) => (
                <DropdownMenuSub key={view.id}>
                  <DropdownMenuSubTrigger className='flex items-center justify-between w-full'>
                    <div className='flex items-center gap-2'>
                      {activeViewId === view.id ? (
                        <Check className='h-4 w-4 text-primary' />
                      ) : (
                        <div className='w-4 h-4' />
                      )}
                      <span className={activeViewId === view.id ? 'font-medium text-primary' : ''}>
                        {view.name}
                      </span>
                    </div>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => handleApplyView(view.id)}>
                        <Check className='mr-2 h-4 w-4' />
                        適用する
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          updateView(storageKey, view.id, currentTableSettings, currentFilterValues)
                        }
                      >
                        <Settings className='mr-2 h-4 w-4' />
                        現在の状態で上書き
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className='text-destructive focus:text-destructive'
                        onClick={() => deleteView(storageKey, view.id)}
                      >
                        <Trash2 className='mr-2 h-4 w-4' />
                        削除
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              ))}
            </>
          ) : (
            <div className='p-2 text-sm text-muted-foreground text-center'>
              保存されたビューはありません
            </div>
          )}

          <DropdownMenuSeparator />

          {activeViewId && (
            <>
              <DropdownMenuItem onClick={handleUpdateActiveView}>
                現在の状態で上書き保存
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleClearActiveView}>
                ビューの選択を解除
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem onClick={() => setIsSaveDialogOpen(true)}>
            <Plus className='mr-2 h-4 w-4' />
            新しいビューとして保存...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>ビューの保存</DialogTitle>
            <DialogDescription>
              現在のフィルター条件や列の表示・並び順に名前を付けて保存します。
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Input
                id='name'
                placeholder='例: 重要プロジェクト一覧'
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveNewView();
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsSaveDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSaveNewView} disabled={!newViewName.trim()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
