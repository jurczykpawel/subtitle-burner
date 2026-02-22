'use client';

import { useState, useCallback } from 'react';
import { useTemplateBridge } from '@/lib/bridges/use-template-bridge';
import { TemplateCard } from './template-card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TemplateCategory } from '@subtitle-burner/types';

const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'bold', label: 'Bold' },
  { value: 'modern', label: 'Modern' },
  { value: 'custom', label: 'Custom' },
];

export function TemplateGallery() {
  const {
    allTemplates,
    activeTemplateId,
    applyTemplate,
    createCustomTemplate,
    removeCustomTemplate,
    style,
  } = useTemplateBridge();

  const [filter, setFilter] = useState('all');
  const [saveOpen, setSaveOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const filtered = filter === 'all' ? allTemplates : allTemplates.filter((t) => t.category === filter);

  const handleSave = useCallback(() => {
    if (!newName.trim()) return;
    createCustomTemplate(newName.trim(), style, { category: 'custom' as TemplateCategory });
    setNewName('');
    setSaveOpen(false);
  }, [newName, style, createCustomTemplate]);

  return (
    <div className="flex h-full flex-col">
      {/* Category filters */}
      <div className="flex flex-wrap gap-1 border-b px-3 py-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setFilter(cat.value)}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
              filter === cat.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-2 gap-2 p-3">
          {filtered.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isActive={activeTemplateId === template.id}
              onApply={applyTemplate}
              onRemove={!template.isBuiltIn ? removeCustomTemplate : undefined}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="px-3 py-8 text-center text-xs text-muted-foreground">
            No templates in this category
          </div>
        )}
      </ScrollArea>

      {/* Save current style as template */}
      <div className="border-t p-3">
        <Button variant="outline" size="sm" className="w-full" onClick={() => setSaveOpen(true)}>
          Save Current as Template
        </Button>
      </div>

      {/* Save dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Template Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My Custom Template"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!newName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
