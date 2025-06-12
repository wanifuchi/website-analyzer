import Joi from 'joi';

export const analysisRequestSchema = Joi.object({
  url: Joi.string()
    .uri({
      scheme: ['http', 'https']
    })
    .required()
    .messages({
      'string.uri': 'URLの形式が正しくありません',
      'any.required': 'URLは必須です'
    }),
  options: Joi.object({
    maxDepth: Joi.number()
      .integer()
      .min(1)
      .max(10)
      .default(3),
    maxPages: Joi.number()
      .integer()
      .min(1)
      .max(1000)
      .default(100),
    skipImages: Joi.boolean().default(false),
    skipCSS: Joi.boolean().default(false),
    skipJS: Joi.boolean().default(false)
  }).default({})
});

export const validateAnalysisRequest = (data: unknown) => {
  const { error, value } = analysisRequestSchema.validate(data, {
    allowUnknown: false,
    stripUnknown: true
  });
  
  if (error) {
    throw new Error(`バリデーションエラー: ${error.details[0].message}`);
  }
  
  return value;
};

export const isValidUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
};

export const sanitizeUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.href;
  } catch {
    throw new Error('無効なURLです');
  }
};