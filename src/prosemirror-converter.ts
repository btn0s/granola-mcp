/**
 * Convert ProseMirror JSON to Markdown
 * Based on the converter from Joseph Thacker's blog post
 */

export interface ProseMirrorNode {
  type: string;
  content?: ProseMirrorNode[];
  text?: string;
  attrs?: Record<string, any>;
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
}

export function convertProseMirrorToMarkdown(
  content: ProseMirrorNode | null | undefined
): string {
  if (!content || typeof content !== "object" || !content.content) {
    return "";
  }

  function processNode(node: ProseMirrorNode): string {
    if (!node || typeof node !== "object") {
      return "";
    }

    const nodeType = node.type || "";
    const nodeContent = node.content || [];
    const text = node.text || "";

    switch (nodeType) {
      case "heading": {
        const level = node.attrs?.level || 1;
        const headingText = nodeContent.map(processNode).join("").trim();
        return `${"#".repeat(level)} ${headingText}\n\n`;
      }

      case "paragraph": {
        const paraText = nodeContent.map(processNode).join("");
        return paraText ? `${paraText}\n\n` : "\n";
      }

      case "bulletList": {
        const items: string[] = [];
        for (const item of nodeContent) {
          if (item.type === "listItem") {
            const itemContent = (item.content || [])
              .map(processNode)
              .join("")
              .trim();
            if (itemContent) {
              items.push(`- ${itemContent}`);
            }
          }
        }
        return items.length > 0 ? items.join("\n") + "\n\n" : "";
      }

      case "orderedList": {
        const items: string[] = [];
        for (let i = 0; i < nodeContent.length; i++) {
          const item = nodeContent[i];
          if (item.type === "listItem") {
            const itemContent = (item.content || [])
              .map(processNode)
              .join("")
              .trim();
            if (itemContent) {
              items.push(`${i + 1}. ${itemContent}`);
            }
          }
        }
        return items.length > 0 ? items.join("\n") + "\n\n" : "";
      }

      case "listItem": {
        return nodeContent.map(processNode).join("");
      }

      case "text": {
        let textContent = text;
        if (node.marks) {
          for (const mark of node.marks) {
            switch (mark.type) {
              case "bold":
                textContent = `**${textContent}**`;
                break;
              case "italic":
                textContent = `*${textContent}*`;
                break;
              case "code":
                textContent = `\`${textContent}\``;
                break;
              case "link":
                const href = mark.attrs?.href || "";
                textContent = `[${textContent}](${href})`;
                break;
            }
          }
        }
        return textContent;
      }

      case "hardBreak":
        return "\n";

      case "codeBlock": {
        const codeContent = nodeContent.map(processNode).join("");
        const language = node.attrs?.language || "";
        return `\`\`\`${language}\n${codeContent}\n\`\`\`\n\n`;
      }

      case "blockquote": {
        const quoteContent = nodeContent
          .map(processNode)
          .join("")
          .trim()
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n");
        return `${quoteContent}\n\n`;
      }

      default:
        // For unknown node types, just process their content
        return nodeContent.map(processNode).join("");
    }
  }

  return processNode(content).trim();
}
