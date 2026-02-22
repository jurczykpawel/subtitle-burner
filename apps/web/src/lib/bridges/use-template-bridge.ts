'use client';

import { useCallback, useMemo, useState } from 'react';
import { useProjectStore } from '@/store/project-store';
import { useEngineStore } from '@/store/engine-store';
import { BUILT_IN_TEMPLATES } from '@subtitle-burner/core';
import { UpdateStyleAction, ApplyTemplateAction } from '@subtitle-burner/core';
import type { SubtitleStyle, SubtitleTemplate, TemplateCategory } from '@subtitle-burner/types';

/**
 * Bridge between UI and TemplateEngine + ProjectStore.
 * Handles template CRUD and application.
 */
export function useTemplateBridge() {
  const style = useProjectStore((s) => s.style);
  const activeTemplateId = useProjectStore((s) => s.activeTemplateId);
  const activeTemplateName = useProjectStore((s) => s.activeTemplateName);
  const executeAction = useProjectStore((s) => s.executeAction);
  const setActiveTemplate = useProjectStore((s) => s.setActiveTemplate);
  const getTemplateEngine = useEngineStore((s) => s.getTemplateEngine);

  // Local custom templates state (in a real app this would be fetched from API)
  const [customTemplates, setCustomTemplates] = useState<SubtitleTemplate[]>([]);

  const builtInTemplates = BUILT_IN_TEMPLATES;

  const allTemplates = useMemo(
    () => [...builtInTemplates, ...customTemplates],
    [builtInTemplates, customTemplates]
  );

  const applyTemplate = useCallback(
    (template: SubtitleTemplate) => {
      const engine = getTemplateEngine();
      const newStyle = engine.applyTemplate(template);
      executeAction(new ApplyTemplateAction(template.id, newStyle));
      setActiveTemplate(template.id, template.name);
    },
    [getTemplateEngine, executeAction, setActiveTemplate]
  );

  const updateStyle = useCallback(
    (updates: Partial<SubtitleStyle>) => {
      executeAction(new UpdateStyleAction(updates));
      // When style is manually changed, detach from template
      setActiveTemplate(null, null);
    },
    [executeAction, setActiveTemplate]
  );

  const createCustomTemplate = useCallback(
    (
      name: string,
      overrides: Partial<SubtitleStyle>,
      options?: { description?: string; category?: TemplateCategory }
    ) => {
      const engine = getTemplateEngine();
      const template = engine.createTemplate(name, overrides, options);
      setCustomTemplates((prev) => [...prev, template]);
      return template;
    },
    [getTemplateEngine]
  );

  const removeCustomTemplate = useCallback(
    (id: string) => {
      const engine = getTemplateEngine();
      setCustomTemplates((prev) => [...engine.removeTemplate(prev, id)]);
    },
    [getTemplateEngine]
  );

  const getTemplateById = useCallback(
    (id: string) => {
      const engine = getTemplateEngine();
      return engine.getTemplateById(customTemplates, id);
    },
    [getTemplateEngine, customTemplates]
  );

  return {
    style,
    activeTemplateId,
    activeTemplateName,
    builtInTemplates,
    customTemplates,
    allTemplates,
    applyTemplate,
    updateStyle,
    createCustomTemplate,
    removeCustomTemplate,
    getTemplateById,
  };
}
