import yaml from "js-yaml";

export function parseYaml(content: string): Record<string, any> {
  try {
    return yaml.load(content) as Record<string, any>;
  } catch (error) {
    throw new Error(
      `Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function isValidYaml(content: string): boolean {
  try {
    yaml.load(content);
    return true;
  } catch {
    return false;
  }
}
