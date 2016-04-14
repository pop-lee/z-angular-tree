/**
 * Created by LiYunpeng on 4/10/16.
 */
angular
    .module('z.angular.tree', [
    ])
    .constant('treeConfig', {
        templateUrl: 'zangular/template/zTreeTemplate.html'
    })
    .directive('zTree', ['$timeout',
        function ($timeout) {
            return {
                restrict: 'AE',
                template:'<div z-tree-node></div>',
                scope: {
                    zTree:'=?',
                    treeData: '=',
                    currentSelect: '=?',
                    options: '=?'
                    // onAfterRender: '&'
                },
                transclude:true,
                controller: ['$scope', function( $scope ) {
                    $scope.$nodeChildren = [];
                    $scope.$nodeMap = {};

                    $scope.options = angular.extend({
                            childrenField:"children",
                            leafNodeCanSelect:true,
                            canMultiple:false,
                            useToggle:true
                        },$scope.options);

                    //包含了选中节点或者自己就是选中节点的节点
                    $scope.hasSelectNodeScopeList = [];
                    $scope.$watch('hasSelectNodeScopeList',function(newList,oldList) {
                        var i,length;
                        if(oldList) {
                            length = oldList.length;
                            for(i=0;i<length;i++) {
                                oldList[i].$model.$hasSelect = false;
                            }
                        }
                        if(newList) {
                            length = newList.length;
                            for(i=0;i<length;i++) {
                                newList[i].$model.$hasSelect = true;
                            }
                        }
                    });
                    //当前选中的节点Scope
                    $scope.$watch('currentSelect',function(newNode,oldNode) {
                        var newScope = getScopeByNode(newNode);
                        var oldScope = getScopeByNode(oldNode);

                        if(oldScope) {
                            oldScope.$model.$selected = false;
                        }
                        if(newScope) {
                            newScope.$model.$selected = true;

                            var hasSelectNodeScopeList = [];
                            hasSelectNodeScopeList.push(newScope);
                            eachParentScope(newScope,function(ns) {
                                hasSelectNodeScopeList.push(ns);
                            });
                            $scope.hasSelectNodeScopeList = hasSelectNodeScopeList;
                        }
                    });

                    $scope.node = {};
                    $scope.node[$scope.options.childrenField] = $scope.treeData;

                    this.$treeRootScope = $scope;

                    $scope.zTree = {}
                    $scope.zTree.selectNode = function(node) {
                        var clickNodeScope = getScopeByNode(node);
                        if($scope.options.canMultiple) {//可多选

                        } else {//不可多选
                            if (isLeafNode(clickNodeScope)) {
                                $scope.currentSelect = clickNodeScope.node;
                            } else {//如果不是叶子节点
                                if (!$scope.options.leafNodeCanSelect) {//判断是否只有叶子节点才可以被选中
                                    $scope.currentSelect = clickNodeScope.node;
                                }
                            }
                        }
                    };
                    $scope.zTree.addChildNode = function(node,parentNode) {
                        if (parentNode != null) {
                            var children = parentNode[$scope.options.childrenField];
                            if (children != null && children != undefined) {
                                children.push(node);
                            }
                        } else {
                            $scope.treeData.push(node);
                        }
                        $timeout(function() {
                            expandNode(getScopeByNode(node));
                        })
                    }
                    $scope.zTree.addAfterNode = function(newNode,targetNode) {
                        var scope = getScopeByNode(targetNode);
                        var parentData = scope.$parentNodeScope.node;
                        var children = parentData[$scope.options.childrenField];
                        children.splice($.inArray(targetNode, children)+1, 0,newNode);
                    }
                    $scope.zTree.delNode = function(node,index) {
                        var scope = getScopeByNode(node);
                        var parentData = scope.$parentNodeScope.node;
                        var children = parentData[$scope.options.childrenField];
                        var flag;
                        if(index) {
                            flag = index;
                        } else {
                            flag = $.inArray(node, children);
                        }
                        children.splice(flag, 1);
                        scope.$parentNodeScope.$nodeChildren.splice(flag,1);

                        //此处不适用递归,引用去掉后让内存自动回收
                        eachTreeScope(scope,function(ns) {
                            //在map中销毁所有已删除的节点
                            delete $scope.$nodeMap[ns.node.$$hashKey];
                        });
                    }
                    $scope.zTree.toggle = function(node) {
                        var ns = getScopeByNode(node);
                        if (!ns) {
                            return;
                        }
                        if (ns.$model.$collapsed) {//如果进行展开的操作
                            expandNode(ns);
                        } else {//如果进行关闭
                            collapseNode(ns);
                        }
                    }
                    if($scope.options.canMultiple) {
                        $scope.zTree.expandAll = function(node) {
                            var nodeScope = getScopeByNode(node);
                            eachTreeScope(nodeScope, function (ns) {
                                ns.$model.$collapsed = false;
                            });
                        }
                        $scope.zTree.collapseAll = function(node) {
                            var nodeScope = getScopeByNode(node);
                            eachTreeScope(nodeScope, function (ns) {
                                ns.$model.$collapsed = true;
                            });
                        }
                    } else {

                    }

                    var getScopeByNode = function(node) {
                        if (node === null || node === undefined) {
                            return null;
                        }
                        return $scope.$nodeMap[node.$$hashKey];
                        return null;
                    }
                    /**
                     * 遍历同级节点Scope,只遍历同级,不深层遍历
                     * @param nodeScope 要遍历同级节点的节点
                     * @param fn
                     * @returns {*}
                     */
                    var eachSameLevelScope = function (nodeScope, fn) {
                        if (nodeScope === undefined || nodeScope === null) {
                            return;
                        }
                        var parentScope = nodeScope.$parentNodeScope;
                        var length = parentScope.$nodeChildren.length;
                        for (var i = 0; i < length; i++) {
                            var ret = fn(parentScope.$nodeChildren[i]);
                            if (ret === "return") {
                                return ret;
                            }
                        }
                    };
                    /**
                     * 遍历树下一级节点(仅下一级,不再深度遍历)
                     * @param nodeScope
                     * @param fn
                     * @returns {*}
                     */
                    var eachNextLevelScope = function (nodeScope, fn) {
                        if (nodeScope === undefined || nodeScope === null) {
                            return;
                        }
                        var length = nodeScope.$nodeChildren.length;
                        for (var i = 0; i < length; i++) {
                            var ret = fn(nodeScope.$nodeChildren[i]);
                            if (ret === "return") {
                                return ret;
                            }
                        }
                    };
                    /**
                     * 遍历包含自己的所有子节点
                     * @param nodeScope
                     * @param fn
                     * @returns {*}
                     */
                    var eachTreeScope = function (nodeScope, fn) {
                        var ret = fn(nodeScope);
                        if (ret === "return") {
                            return ret;
                        } else {
                            return eachNextLevelScope(nodeScope, function (ns) {
                                return eachTreeScope(ns, fn);
                            });
                        }
                    }

                    var eachParentScope = function(nodeScope,fn) {

                        var parentScope = nodeScope.$parentNodeScope;
                        if(parentScope === $scope) {
                            return;
                        } else {
                            fn(parentScope);
                            eachParentScope(parentScope,fn);
                        }
                    }
                    /**
                     * 在某一节点下查找节点
                     * @param nodeScope 要查找的节点
                     * @param parentNodeScope 被查找的树的根节点
                     * @returns {*}
                     */
                    var findScope = function (nodeScope, parentNodeScope) {
                        if (!parentNodeScope) {
                            parentNodeScope = $scope;
                        }
                        var ns = null;
                        eachTreeScope(parentNodeScope, function (eachNodeScope) {
                            if (eachNodeScope === nodeScope) {
                                ns = eachNodeScope;
                                return "return";
                            }
                        });
                        return ns;
                    };
                    /**
                     * 判断是否为叶子节点
                     * @param nodeScope
                     * @returns {boolean}
                     */
                    var isLeafNode = function (nodeScope) {
                        return nodeScope.$nodeChildren.length === 0;
                    };
                    /**
                     * 查找自己或者子节点是否有当前选择的节点
                     * @param nodeScope
                     * @returns {boolean}
                     */
                    var childHasActive = function (nodeScope) {
                        if (findScope(getScopeByNode($scope.currentSelect), nodeScope) != undefined) {
                            return true;
                        }
                        return false;
                    };

                    /**
                     * 关闭节点
                     * @param nodeScope
                     */
                    var collapseNode = function (nodeScope) {
                        if (childHasActive(nodeScope)) {
                            $scope.hasSelectNodeScope = nodeScope;
                        }

                        nodeScope.$model.$collapsed = true;
                    };
                    /**
                     * 展开节点
                     * @param nodeScope
                     */
                    var expandNode = function (nodeScope) {

                        if (!nodeScope.$model.$collapsed) {
                            return;
                        }

                        if ($scope.options.useToggle) {//判断是否使用互斥
                            eachSameLevelScope(nodeScope, function (ns) {
                                if (ns === nodeScope) {
                                    return;
                                }
                                collapseNode(ns);
                            });
                        }
                        //递归展开父级
                        if (nodeScope.$parentNodeScope.$model) {
                            expandNode(nodeScope.$parentNodeScope);
                        }

                        //叶子节点不进行关闭,非叶子节点,进行关闭
                        if (!isLeafNode(nodeScope)) {
                            nodeScope.$model.$collapsed = false;
                        }
                    };

                }],
                compile: function(element, attrs, transclude) {
                    return function ( scope, element, attrs, ctrls ) {
                        //递归潜逃时候的transclude,存入scope之后,可在子节点中继续进行调用
                        scope.transclude = transclude;
                    }
                }
            };
        }
    ])
    .directive("zTreeNode",['$compile','$templateCache','treeConfig', function($compile, $templateCache, treeConfig) {
        return {
            restrict: 'AE',
            scope:true,
            controller: function() {
                var template = $templateCache.get(treeConfig.templateUrl);
                this.template = $compile(template);
            },
            link: function( scope, element, attrs, ctrls) {
                ctrls.template(scope, function(clone) {
                    element.html('').append(clone);
                });
            }
        };
    }])
    // .directive("zTreeSelectZone", function() {
    //     return {
    //         restrict: 'AE',
    //         scope: true,
    //         require: "^zTree",
    //         link: function( scope, element, attrs, ctrls) {
    //             element.on('click',function(event) {
    //                 scope.$apply(function() {
    //                     ctrls.$treeRootScope.zTree.selectNode(scope.node);
    //                 });
    //                 //阻止事件继续向上冒泡
    //                 event.stopPropagation();
    //             });
    //         }
    //     };
    // })
    .directive("zTreeTransclude", function() {//为了让递归的指令都共用rootParentScope
        return {
            require: "^zTree",
            link: function(scope, element, attrs, controller) {

                var rootScope = controller.$treeRootScope;

                scope.transcludeScope = rootScope.$parent.$new();
                scope.transcludeScope.$nodeChildren = [];
                scope.transcludeScope.$parentNodeScope = scope.$parent.$parent;
                scope.transcludeScope.node = scope.node;
                scope.transcludeScope.options = rootScope.options;
                scope.transcludeScope.$model = {
                    $nodeLevel:0,
                    // $nodeKey:null,
                    $collapsed:true,
                    $hasSelect:false,
                    $selected:false,
                    $nodeLevel:scope.$parent.$parent.$model?scope.$parent.$model.$nodeLevel+1:1//如果有$model则代表不是根节点
                };

                //将scope存入父级的子节点集合数组
                scope.transcludeScope.$parentNodeScope.$nodeChildren.push(scope.transcludeScope);
                scope.$on('$destroy', function() {
                    scope.transcludeScope.$destroy();
                });

                //将scope加入整个树的map一维存储
                rootScope.$nodeMap[scope.node.$$hashKey] = scope.transcludeScope;
                rootScope.transclude(scope.transcludeScope, function(clone) {
                    element.html('').append(clone);
                });
            }
        };
    });
;

angular.module("z.angular.tree").run(["$templateCache", function($templateCache) {$templateCache.put("zangular/template/zTreeTemplate.html","<ul class=\"nav\"><li ng-repeat=\"node in node[options.childrenField]\" class=\"z-tree-node\"><div z-tree-transclude=\"\"></div></li></ul>");}]);