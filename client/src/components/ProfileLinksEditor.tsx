import { Plus, X, Link as LinkIcon } from 'lucide-react';
import type { ProfileLink } from '../types';
import './profile-links-editor.css';

interface ProfileLinksEditorProps {
  links: ProfileLink[];
  onChange: (links: ProfileLink[]) => void;
}

export function ProfileLinksEditor({ links, onChange }: ProfileLinksEditorProps) {
  const addLink = () => {
    if (links.length >= 5) return;
    const newLink: ProfileLink = {
      id: crypto.randomUUID(),
      label: '',
      url: '',
    };
    onChange([...links, newLink]);
  };

  const removeLink = (id: string) => {
    onChange(links.filter((link) => link.id !== id));
  };

  const updateLink = (id: string, field: 'label' | 'url', value: string) => {
    onChange(
      links.map((link) =>
        link.id === id ? { ...link, [field]: value } : link
      )
    );
  };

  return (
    <div className="profile-links-editor">
      <div className="profile-links-header">
        <label>External Links</label>
        <button
          type="button"
          onClick={addLink}
          disabled={links.length >= 5}
          className="add-link-btn"
        >
          <Plus size={16} /> Add Link
        </button>
      </div>
      {links.length === 0 && (
        <p className="no-links-hint">
          Add links to your LinkedIn, portfolio, GitHub, or personal website so PIs can learn more about your work.
        </p>
      )}
      <div className="links-list">
        {links.map((link) => (
          <div key={link.id} className="link-editor-item">
            <LinkIcon size={16} className="link-icon" />
            <input
              type="text"
              placeholder="Label (e.g., LinkedIn)"
              value={link.label}
              onChange={(e) => updateLink(link.id, 'label', e.target.value)}
              className="link-label-input"
            />
            <input
              type="url"
              placeholder="https://..."
              value={link.url}
              onChange={(e) => updateLink(link.id, 'url', e.target.value)}
              className="link-url-input"
            />
            <button
              type="button"
              onClick={() => removeLink(link.id)}
              className="remove-link-btn"
              aria-label="Remove link"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
      {links.length > 0 && links.length < 5 && (
        <p className="link-limit-hint">You can add up to {5 - links.length} more link(s).</p>
      )}
    </div>
  );
}
