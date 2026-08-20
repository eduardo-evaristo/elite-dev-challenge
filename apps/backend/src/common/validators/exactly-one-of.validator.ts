import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

@ValidatorConstraint({ name: 'exactlyOneOf', async: false })
export class ExactlyOneOfConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const fields = args.constraints[0] as string[];
    const obj = args.object as Record<string, unknown>;
    const count = fields.filter(
      (f) => obj[f] !== undefined && obj[f] !== null && obj[f] !== '',
    ).length;
    return count === 1;
  }

  defaultMessage(args: ValidationArguments): string {
    const fields = args.constraints[0] as string[];
    return `Forneça exatamente um de ${fields.join(', ')}`;
  }
}

export function ExactlyOneOf(
  fields: string[],
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'exactlyOneOf',
      target: object.constructor,
      propertyName,
      constraints: [fields],
      options: validationOptions,
      validator: ExactlyOneOfConstraint,
    });
  };
}
