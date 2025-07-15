import { z } from 'zod';

export const SceneSchema = z.object({
  id: z.string(),
  background: z.string().optional(),
  music: z.string().optional(),
  characters: z.array(z.object({
    id: z.string(),
    name: z.string(),
    position: z.enum(['left', 'center', 'right']),
    expression: z.string().optional(),
    sprite: z.string().optional()
  })).optional(),
  dialogue: z.object({
    speaker: z.string().optional(),
    text: z.string(),
    voice: z.string().optional()
  }),
  choices: z.array(z.object({
    text: z.string(),
    nextSceneId: z.string(),
    condition: z.string().optional()
  })).optional(),
  nextSceneId: z.string().optional(),
  effects: z.array(z.object({
    type: z.enum(['shake', 'fade', 'flash', 'transition']),
    duration: z.number().optional(),
    intensity: z.number().optional()
  })).optional()
});

export const VisualNovelSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  author: z.string(),
  tags: z.array(z.string()),
  cover: z.string().optional(),
  scenes: z.array(SceneSchema),
  variables: z.record(z.any()).optional(),
  routes: z.array(z.object({
    id: z.string(),
    name: z.string(),
    startSceneId: z.string(),
    endSceneId: z.string()
  })).optional()
});

export type Scene = z.infer<typeof SceneSchema>;
export type VisualNovel = z.infer<typeof VisualNovelSchema>;

export class VisualNovelEngine {
  private novel: VisualNovel;
  private currentSceneIndex: number = 0;
  private variables: Record<string, any> = {};
  private history: string[] = [];

  constructor(novel: VisualNovel) {
    this.novel = novel;
    this.variables = novel.variables || {};
  }

  getCurrentScene(): Scene | null {
    const currentSceneId = this.history[this.history.length - 1] || this.novel.scenes[0]?.id;
    return this.novel.scenes.find(scene => scene.id === currentSceneId) || null;
  }

  goToScene(sceneId: string): Scene | null {
    const scene = this.novel.scenes.find(s => s.id === sceneId);
    if (scene) {
      this.history.push(sceneId);
      return scene;
    }
    return null;
  }

  makeChoice(choiceIndex: number): Scene | null {
    const currentScene = this.getCurrentScene();
    if (!currentScene || !currentScene.choices) return null;

    const choice = currentScene.choices[choiceIndex];
    if (!choice) return null;

    // Evaluate condition if present
    if (choice.condition) {
      const conditionMet = this.evaluateCondition(choice.condition);
      if (!conditionMet) return null;
    }

    return this.goToScene(choice.nextSceneId);
  }

  nextScene(): Scene | null {
    const currentScene = this.getCurrentScene();
    if (!currentScene || !currentScene.nextSceneId) return null;
    
    return this.goToScene(currentScene.nextSceneId);
  }

  setVariable(name: string, value: any): void {
    this.variables[name] = value;
  }

  getVariable(name: string): any {
    return this.variables[name];
  }

  private evaluateCondition(condition: string): boolean {
    // Simple condition evaluation
    // In a real implementation, you'd want a proper expression parser
    try {
      // WARNING: eval is dangerous in production! Use a proper expression parser
      const func = new Function(...Object.keys(this.variables), `return ${condition}`);
      return func(...Object.values(this.variables));
    } catch {
      return false;
    }
  }

  getHistory(): string[] {
    return [...this.history];
  }

  reset(): void {
    this.currentSceneIndex = 0;
    this.history = [];
    this.variables = this.novel.variables || {};
  }
}

export class VisualNovelBuilder {
  private novel: Partial<VisualNovel> = {
    scenes: [],
    tags: [],
    variables: {}
  };

  setMetadata(metadata: Pick<VisualNovel, 'id' | 'title' | 'description' | 'author'>): this {
    Object.assign(this.novel, metadata);
    return this;
  }

  addScene(scene: Scene): this {
    if (!this.novel.scenes) this.novel.scenes = [];
    this.novel.scenes.push(scene);
    return this;
  }

  addTag(tag: string): this {
    if (!this.novel.tags) this.novel.tags = [];
    this.novel.tags.push(tag);
    return this;
  }

  setVariable(name: string, defaultValue: any): this {
    if (!this.novel.variables) this.novel.variables = {};
    this.novel.variables[name] = defaultValue;
    return this;
  }

  build(): VisualNovel {
    const result = VisualNovelSchema.parse(this.novel);
    return result;
  }
}

export async function generateVisualNovelFromPrompt(
  prompt: string,
  generateScene: (prompt: string) => Promise<Scene>,
  characterCard?: any
): Promise<VisualNovel> {
  // This is a placeholder for AI-assisted visual novel generation
  // In a real implementation, this would use the LLM to generate scenes
  const builder = new VisualNovelBuilder();
  
  // Generate metadata based on prompt
  builder.setMetadata({
    id: `vn-${Date.now()}`,
    title: 'Generated Visual Novel',
    description: prompt,
    author: 'AI Generated'
  });

  // Generate initial scenes (placeholder)
  const introScene: Scene = await generateScene(`Create an introduction scene for: ${prompt}`);
  builder.addScene(introScene);

  return builder.build();
}