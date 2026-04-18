/**
 * A4 — Frequency-weighted prefix trie for autocomplete.
 */
interface TrieNode {
  children: Map<string, TrieNode>;
  value?: string;
  frequency: number;
}

export class FrequencyTrie {
  private root: TrieNode = { children: new Map(), frequency: 0 };

  insert(word: string, frequency = 1) {
    const trimmed = word.trim();
    if (!trimmed) return;
    let node = this.root;
    for (const char of trimmed.toLowerCase()) {
      if (!node.children.has(char)) {
        node.children.set(char, { children: new Map(), frequency: 0 });
      }
      node = node.children.get(char)!;
    }
    node.value = trimmed;
    node.frequency += frequency;
  }

  suggest(prefix: string, limit = 5): string[] {
    const trimmed = prefix.trim().toLowerCase();
    if (!trimmed) return [];
    let node = this.root;
    for (const char of trimmed) {
      const next = node.children.get(char);
      if (!next) return [];
      node = next;
    }
    const results: Array<{ word: string; frequency: number }> = [];
    this.collect(node, results);
    return results
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit)
      .map((r) => r.word);
  }

  private collect(node: TrieNode, results: Array<{ word: string; frequency: number }>) {
    if (node.value) results.push({ word: node.value, frequency: node.frequency });
    for (const child of node.children.values()) this.collect(child, results);
  }
}
