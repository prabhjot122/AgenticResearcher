import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Heading from '@tiptap/extension-heading';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Strike from '@tiptap/extension-strike';
import Code from '@tiptap/extension-code';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Strikethrough as StrikeIcon,
  Heading1 as H1Icon,
  Heading2 as H2Icon,
  Code as CodeIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  AlignLeft as AlignLeftIcon,
  AlignCenter as AlignCenterIcon,
  AlignRight as AlignRightIcon,
  FileDown as FileDownIcon,
  List as BulletListIcon,
  ListOrdered as OrderedListIcon,
  Maximize as MaximizeIcon,
  Minimize as MinimizeIcon,
} from 'lucide-react';

interface TextEditorProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
}

// Helper function to convert markdown-like text to HTML
const formatContentToHTML = (content: string): string => {
  if (!content) return '';
  
  // Process the content line by line
  const lines = content.split('\n');
  let formattedContent = '';
  let inList = false;
  let inOrderedList = false;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Handle headings (# Heading 1, ## Heading 2, etc.)
    if (line.match(/^#{1,6}\s/)) {
      const level = line.match(/^(#{1,6})\s/)?.[1].length || 1;
      const text = line.replace(/^#{1,6}\s/, '');
      formattedContent += `<h${level}>${text}</h${level}>`;
      continue;
    }
    
    // Handle bullet lists
    if (line.match(/^\s*[-*•]\s/)) {
      if (!inList) {
        formattedContent += '<ul>';
        inList = true;
      }
      const text = line.replace(/^\s*[-*•]\s/, '');
      formattedContent += `<li>${text}</li>`;
      
      // Check if next line is not a list item
      if (i === lines.length - 1 || !lines[i + 1].match(/^\s*[-*•]\s/)) {
        formattedContent += '</ul>';
        inList = false;
      }
      continue;
    }
    
    // Handle numbered lists
    if (line.match(/^\s*\d+\.\s/)) {
      if (!inOrderedList) {
        formattedContent += '<ol>';
        inOrderedList = true;
      }
      const text = line.replace(/^\s*\d+\.\s/, '');
      formattedContent += `<li>${text}</li>`;
      
      // Check if next line is not a list item
      if (i === lines.length - 1 || !lines[i + 1].match(/^\s*\d+\.\s/)) {
        formattedContent += '</ol>';
        inOrderedList = false;
      }
      continue;
    }
    
    // Handle bold text with ** or __
    line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    line = line.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Handle italic text with * or _
    line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
    line = line.replace(/_(.*?)_/g, '<em>$1</em>');
    
    // Handle code blocks
    if (line.trim() === '```' || line.trim().startsWith('```')) {
      formattedContent += '<pre><code>';
      i++;
      while (i < lines.length && !lines[i].trim().endsWith('```')) {
        formattedContent += lines[i] + '\n';
        i++;
      }
      formattedContent += '</code></pre>';
      continue;
    }
    
    // Handle inline code
    line = line.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Handle links
    line = line.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
    
    // Handle empty lines as paragraph breaks
    if (line.trim() === '') {
      formattedContent += '<p></p>';
    } else {
      // Regular paragraph
      formattedContent += `<p>${line}</p>`;
    }
  }
  
  return formattedContent;
};

export const TextEditor = ({ initialContent = '', onContentChange }: TextEditorProps) => {
  console.log("TextEditor rendering with initialContent:", initialContent.substring(0, 50) + "...");
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Format the initial content before creating the editor
  const formattedInitialContent = formatContentToHTML(initialContent);

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Heading.configure({
        levels: [1, 2, 3, 4, 5, 6], // Support all heading levels
      }),
      Bold,
      Italic,
      Strike,
      Code,
      Link.configure({
        openOnClick: false,
      }),
      Image,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      BulletList,
      OrderedList,
      ListItem,
      StarterKit.configure({
        document: false,
        paragraph: false,
        text: false,
        heading: false,
        bold: false,
        italic: false,
        strike: false,
        code: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
    ],
    content: formattedInitialContent,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onContentChange?.(html);
    },
    autofocus: true,
    editable: true,
  });

  // Update editor content when initialContent changes
  useEffect(() => {
    if (editor && initialContent) {
      console.log("Updating editor content because initialContent changed");
      const formattedContent = formatContentToHTML(initialContent);
      editor.commands.setContent(formattedContent);
    }
  }, [editor, initialContent]);

  // Handle escape key to exit full screen
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isFullScreen]);

  // Add/remove body class to prevent scrolling when in full screen
  useEffect(() => {
    if (isFullScreen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isFullScreen]);

  const handleExportPDF = () => {
    const content = editor?.getHTML() || '';
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const MenuButton = ({ 
    onClick, 
    isActive = false, 
    icon: Icon,
    tooltip
  }: { 
    onClick: () => void; 
    isActive?: boolean; 
    icon: React.ElementType;
    tooltip: string;
  }) => (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      type="button"
      className={`relative p-2 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${
        isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
      }`}
      title={tooltip}
    >
      <Icon className="w-5 h-5" />
      {isActive && (
        <div className="absolute inset-0 rounded-lg border-2 border-primary pointer-events-none" />
      )}
    </button>
  );

  const MenuBar = () => {
    if (!editor) {
      return null;
    }

    return (
      <div className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="flex items-center justify-between gap-1 p-2">
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
              <MenuButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
                icon={BoldIcon}
                tooltip="Bold"
              />
              <MenuButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
                icon={ItalicIcon}
                tooltip="Italic"
              />
              <MenuButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                isActive={editor.isActive('strike')}
                icon={StrikeIcon}
                tooltip="Strikethrough"
              />
            </div>

            <div className="w-px h-6 bg-border mx-1" />

            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
              <MenuButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                isActive={editor.isActive('heading', { level: 1 })}
                icon={H1Icon}
                tooltip="Heading 1"
              />
              <MenuButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                isActive={editor.isActive('heading', { level: 2 })}
                icon={H2Icon}
                tooltip="Heading 2"
              />
            </div>

            <div className="w-px h-6 bg-border mx-1" />

            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
              <MenuButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive('bulletList')}
                icon={BulletListIcon}
                tooltip="Bullet List"
              />
              <MenuButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive('orderedList')}
                icon={OrderedListIcon}
                tooltip="Numbered List"
              />
            </div>

            <div className="w-px h-6 bg-border mx-1" />

            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
              <MenuButton
                onClick={() => editor.chain().focus().toggleCode().run()}
                isActive={editor.isActive('code')}
                icon={CodeIcon}
                tooltip="Code"
              />
              <MenuButton
                onClick={() => {
                  const url = window.prompt('Enter the URL:');
                  if (url) {
                    editor.chain().focus().setLink({ href: url }).run();
                  }
                }}
                isActive={editor.isActive('link')}
                icon={LinkIcon}
                tooltip="Add Link"
              />
              <MenuButton
                onClick={() => {
                  const url = window.prompt('Enter the image URL:');
                  if (url) {
                    editor.chain().focus().setImage({ src: url }).run();
                  }
                }}
                icon={ImageIcon}
                tooltip="Add Image"
                isActive={false}
              />
            </div>

            <div className="w-px h-6 bg-border mx-1" />

            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
              <MenuButton
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                isActive={editor.isActive('textAlign', { align: 'left' })}
                icon={AlignLeftIcon}
                tooltip="Align Left"
              />
              <MenuButton
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                isActive={editor.isActive('textAlign', { align: 'center' })}
                icon={AlignCenterIcon}
                tooltip="Align Center"
              />
              <MenuButton
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                isActive={editor.isActive('textAlign', { align: 'right' })}
                icon={AlignRightIcon}
                tooltip="Align Right"
              />
            </div>

            <div className="w-px h-6 bg-border mx-1" />

            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
              <MenuButton
                onClick={() => editor.chain().focus().undo().run()}
                icon={UndoIcon}
                tooltip="Undo"
                isActive={false}
              />
              <MenuButton
                onClick={() => editor.chain().focus().redo().run()}
                icon={RedoIcon}
                tooltip="Redo"
                isActive={false}
              />
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
            <MenuButton
                            onClick={toggleFullScreen}
              icon={isFullScreen ? MinimizeIcon : MaximizeIcon}
              tooltip={isFullScreen ? "Exit Full Screen" : "Full Screen"}
              isActive={isFullScreen}
            />
            <MenuButton
              onClick={handleExportPDF}
              icon={FileDownIcon}
              tooltip="Export as PDF"
              isActive={false}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`editor-container bg-background rounded-xl overflow-hidden shadow-lg border border-border ${
        isFullScreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
      style={{ marginTop: isFullScreen ? '0' : '40px' }}
    >
      <MenuBar />
      <motion.div 
        className={`p-6 ${isFullScreen ? 'h-[calc(100vh-56px)] overflow-y-auto' : ''}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
                <style>{`
          .ProseMirror {
            outline: none !important;
            ${isFullScreen ? 'min-height: calc(100vh - 150px);' : ''}
          }
          .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #adb5bd;
            pointer-events: none;
            height: 0;
          }
          .ProseMirror:focus-visible {
            outline: none !important;
            box-shadow: none !important;
          }
          .ProseMirror h1 {
            font-size: 2.5rem !important;
            font-weight: 700 !important;
            margin-bottom: 1rem !important;
            line-height: 1.2 !important;
          }
          .ProseMirror h2 {
            font-size: 1.875rem !important;
            font-weight: 600 !important;
            margin-bottom: 0.75rem !important;
            line-height: 1.3 !important;
          }
          .ProseMirror h3 {
            font-size: 1.5rem !important;
            font-weight: 600 !important;
            margin-bottom: 0.75rem !important;
            line-height: 1.3 !important;
          }
          .ProseMirror h4 {
            font-size: 1.25rem !important;
            font-weight: 600 !important;
            margin-bottom: 0.5rem !important;
          }
          .ProseMirror p {
            margin-bottom: 0.75rem !important;
            line-height: 1.6 !important;
          }
          .ProseMirror ul, .ProseMirror ol {
            padding-left: 1.5rem !important;
            margin-bottom: 1rem !important;
          }
          .ProseMirror ul {
            list-style-type: disc !important;
          }
          .ProseMirror ol {
            list-style-type: decimal !important;
          }
          .ProseMirror li {
            margin-bottom: 0.25rem !important;
          }
          .ProseMirror li p {
            margin-bottom: 0.25rem !important;
          }
          .ProseMirror blockquote {
            border-left: 3px solid #e2e8f0 !important;
            padding-left: 1rem !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            font-style: italic !important;
          }
          .ProseMirror code {
            background-color: rgba(0, 0, 0, 0.1) !important;
            border-radius: 0.25rem !important;
            padding: 0.1rem 0.25rem !important;
            font-family: monospace !important;
          }
          .ProseMirror pre {
            background-color: #1e293b !important;
            color: #e2e8f0 !important;
            padding: 0.75rem 1rem !important;
            border-radius: 0.5rem !important;
            overflow-x: auto !important;
            margin-bottom: 1rem !important;
          }
          .ProseMirror pre code {
            background-color: transparent !important;
            padding: 0 !important;
            color: inherit !important;
          }
          .ProseMirror a {
            color: #3b82f6 !important;
            text-decoration: underline !important;
          }
          .ProseMirror img {
            max-width: 100% !important;
            height: auto !important;
            border-radius: 0.375rem !important;
          }
        `}</style>
        <EditorContent editor={editor} />
      </motion.div>
    </motion.div>
  );
};

