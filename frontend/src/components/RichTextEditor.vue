<template>
  <div class="rte-wrap">
    <div class="rte-toolbar">
      <button type="button" class="rte-btn" :class="{ active: editor?.isActive('bold') }"
        @click="editor.chain().focus().toggleBold().run()" title="粗体"><strong>B</strong></button>
      <button type="button" class="rte-btn" :class="{ active: editor?.isActive('italic') }"
        @click="editor.chain().focus().toggleItalic().run()" title="斜体"><em>I</em></button>
      <div class="rte-sep"></div>
      <button type="button" class="rte-btn" :class="{ active: editor?.isActive('heading', { level: 2 }) }"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()">H2</button>
      <button type="button" class="rte-btn" :class="{ active: editor?.isActive('heading', { level: 3 }) }"
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()">H3</button>
      <div class="rte-sep"></div>
      <button type="button" class="rte-btn" :class="{ active: editor?.isActive('bulletList') }"
        @click="editor.chain().focus().toggleBulletList().run()" title="无序列表">≡</button>
      <button type="button" class="rte-btn" :class="{ active: editor?.isActive('orderedList') }"
        @click="editor.chain().focus().toggleOrderedList().run()" title="有序列表">1.</button>
      <div class="rte-sep"></div>
      <button type="button" class="rte-btn" :class="{ active: editor?.isActive('code') }"
        @click="editor.chain().focus().toggleCode().run()" title="行内代码">`</button>
      <button type="button" class="rte-btn" :class="{ active: editor?.isActive('codeBlock') }"
        @click="editor.chain().focus().toggleCodeBlock().run()" title="代码块">{ }</button>
      <div class="rte-sep"></div>
      <button type="button" class="rte-btn"
        @click="editor.chain().focus().setHorizontalRule().run()" title="分割线">—</button>
    </div>
    <editor-content :editor="editor" class="rte-content" />
  </div>
</template>

<script setup>
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const editor = useEditor({
  content: props.modelValue,
  extensions: [StarterKit],
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  },
})

watch(() => props.modelValue, (val) => {
  if (editor.value && editor.value.getHTML() !== val) {
    editor.value.commands.setContent(val || '', false)
  }
})

onBeforeUnmount(() => editor.value?.destroy())
</script>

<style scoped>
.rte-wrap {
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
  background: var(--surface);
}

.rte-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
  flex-wrap: wrap;
}

.rte-btn {
  background: none;
  border: none;
  padding: 3px 7px;
  font-size: var(--text-xs);
  font-family: var(--font-sans);
  color: var(--text-2);
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
  line-height: 1.4;
}
.rte-btn:hover { background: var(--surface); color: var(--text); }
.rte-btn.active { background: rgba(255,255,255,0.12); color: var(--text); }

.rte-sep {
  width: 1px;
  height: 16px;
  background: var(--border);
  margin: 0 4px;
  flex-shrink: 0;
}

/* ProseMirror editor area */
.rte-content :deep(.ProseMirror) {
  min-height: 200px;
  padding: 12px 14px;
  font-size: var(--text-sm);
  color: var(--text);
  line-height: 1.7;
  outline: none;
}
.rte-content :deep(.ProseMirror p) { margin: 0 0 0.6em; }
.rte-content :deep(.ProseMirror p:last-child) { margin-bottom: 0; }
.rte-content :deep(.ProseMirror h2) {
  font-size: var(--text-base);
  font-weight: 700;
  margin: 1em 0 0.4em;
  color: var(--text);
}
.rte-content :deep(.ProseMirror h3) {
  font-size: var(--text-sm);
  font-weight: 600;
  margin: 0.8em 0 0.3em;
  color: var(--text);
}
.rte-content :deep(.ProseMirror ul),
.rte-content :deep(.ProseMirror ol) {
  padding-left: 20px;
  margin: 0 0 0.6em;
}
.rte-content :deep(.ProseMirror li) { margin-bottom: 2px; }
.rte-content :deep(.ProseMirror code) {
  font-family: var(--font-mono);
  font-size: 0.88em;
  background: rgba(255,255,255,0.08);
  padding: 1px 5px;
  border-radius: 3px;
  color: var(--text);
}
.rte-content :deep(.ProseMirror pre) {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 10px 14px;
  margin: 0 0 0.6em;
  overflow-x: auto;
}
.rte-content :deep(.ProseMirror pre code) {
  background: none;
  padding: 0;
  font-size: var(--text-xs);
}
.rte-content :deep(.ProseMirror hr) {
  border: none;
  border-top: 1px solid var(--border);
  margin: 1em 0;
}
.rte-content :deep(.ProseMirror-focused) { outline: none; }
.rte-content :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  color: var(--text-3);
  pointer-events: none;
  float: left;
  height: 0;
}
</style>
