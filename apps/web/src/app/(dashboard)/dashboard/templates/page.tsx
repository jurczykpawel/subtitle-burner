'use client';

import { useEffect, useState } from 'react';
import { BUILT_IN_TEMPLATES } from '@subtitle-burner/core';
import type { SubtitleTemplate } from '@subtitle-burner/types';

import { TemplateCard } from '@/components/editor/template-card';

export default function TemplatesPage() {
  const [userTemplates, setUserTemplates] = useState<SubtitleTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/templates')
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((resp) => setUserTemplates(resp.data ?? []))
      .catch(() => setUserTemplates([]))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/v1/templates/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setUserTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage subtitle style templates
          </p>
        </div>
      </div>

      {/* User templates */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold">My Templates</h2>
        {loading ? (
          <p className="mt-4 text-muted-foreground">Loading...</p>
        ) : userTemplates.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No custom templates yet. Create one in the editor by clicking &ldquo;Save Current as Template&rdquo;.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {userTemplates.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                isActive={false}
                onApply={() => {}}
                onRemove={handleDelete}
              />
            ))}
          </div>
        )}
      </section>

      {/* Built-in presets */}
      <section className="mt-12">
        <h2 className="text-lg font-semibold">Built-in Presets</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pre-designed templates available to all users
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {BUILT_IN_TEMPLATES.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              isActive={false}
              onApply={() => {}}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
