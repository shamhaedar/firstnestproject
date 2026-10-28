import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorator/roles.decorator.js';
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(), 
      context.getClass(),
    ]);
    if (!roles) return true; 
    const req= context.switchToHttp().getRequest();
    const user=req.user;
    if(user.role==Role.ADMIN){
      return true;
    }
    
    return roles.includes(user?.role);
  }
}
