import { ExternalLink, Github, Linkedin, Globe } from 'lucide-react';
import type { ProfileLink } from '../types';
import './profile-links-display.css';

interface ProfileLinksDisplayProps {
  links: ProfileLink[];
}

function getLinkIcon(label: string) {
  const lower = label.toLowerCase();
  if (lower.includes('github')) return <Github size={16} />;
  if (lower.includes('linkedin')) return <Linkedin size={16} />;
  if (lower.includes('website') || lower.includes('portfolio') || lower.includes('personal')) {
    return <Globe size={16} />;
  }
  return <ExternalLink size={16} />;
}

export function ProfileLinksDisplay({ links }: ProfileLinksDisplayProps) {
  if (!links || links.length === 0) return null;

  return (
    <div className="profile-links-display">
      <h3>Links</h3>
      <ul className="links-list">
        {links.map((link) => (
          <li key={link.id}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="profile-link-item"
            >
              {getLinkIcon(link.label)}
              <span className="link-label">{link.label}</span>
              <ExternalLink size={14} className="external-icon" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
