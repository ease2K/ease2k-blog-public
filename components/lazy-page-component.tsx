import { lazy, Suspense, useRef, type ComponentType } from "react";

export function lazyPageComponent<Props extends object>(load: () => Promise<{ default: ComponentType<Props> }>) {
    let ready: ComponentType<Props> | undefined;
    let pending: ReturnType<typeof load> | undefined;
    function prepare() {
        return pending ||= load().then(module => {
            ready = module.default;
            return module;
        }).catch(error => {
            pending = undefined;
            throw error;
        });
    }
    const Lazy = lazy(prepare);
    function PageComponent(props: Props) {
        const Component = useRef(ready || Lazy).current;
        return <Suspense fallback={null}><Component {...props} /></Suspense>;
    }
    return { PageComponent, prepare };
}
