
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

  // Ne pas afficher le loader pour certaines requêtes
  if (req.headers.has('X-Skip-Loading')) {
    const modifiedRequest = req.clone({
      headers: req.headers.delete('X-Skip-Loading')
    });
    return next(modifiedRequest);
  }

  loadingService.show();

  return next(req).pipe(
    finalize(() => loadingService.hide())
  );
};
