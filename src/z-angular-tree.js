/**
 * Created by LiYunpeng on 4/10/16.
 */
angular
    .module('z.angular.tree', [
    ])
    .constant('treeConfig', {
        templateUrl: 'zangular/template/zTreeTemplate.html'
    })
    .directive('zTree', ['$compile','$timeout','treeConfig',
        function ($compile,$timeout,treeConfig) {
            return {
                restrict: 'AE',
                transclude: true,
                scope: {
                    zTree:'=?',
                    treeData: '=',
                    currentSelect: '=?',
                    onAfterRender: '&'
                },
                transclude:true,
                controller: ['$scope', '$templateCache', '$interpolate', 'treeConfig', function( $scope, $templateCache, $interpolate, treeConfig ) {
                    $scope.$nodeChildren = [];
                    $scope.$nodeMap = {};
                    $scope.$treeRootParentScope = $scope.$parent;
                    $scope.$treeRootScope = $scope;
                    $scope.options = {
                        childrenField:"children",
                        leafNodeCanSelect:true,
                        canMultiple:false,
                        useToggle:true
                    }
                    var template = $templateCache.get(treeConfig.templateUrl);

                    //包含了选中节点或者自己就是选中节点的节点
                    $scope.hasSelectNodeScopeList = [];
                    $scope.$watch('hasSelectNodeScopeList',function(newList,oldList) {
                        var length;
                        var i;
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

                    $scope.onClickHandle = function(event,node) {
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
                    }

                    $scope.node = {};
                    $scope.node[$scope.options.childrenField] = $scope.treeData;
                    this.template = $compile(template);//$interpolate(template)({options: $scope.options}));
                    
                    var tree = $scope.zTree;
                    if (tree != null) {
                        if (angular.isObject(tree)) {
                            tree.addChildNode = function(node,parentNode) {
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
                            tree.addAfterNode = function(newNode,targetNode) {
                                var scope = getScopeByNode(targetNode);
                                var parentData = scope.$parent.node;
                                var children = parentData[$scope.options.childrenField];
                                children.splice($.inArray(targetNode, children)+1, 0,newNode);
                            }
                            tree.delNode = function(node,index) {
                                var scope = getScopeByNode(node);
                                var parentData = scope.$parent.node;
                                // if (parentData) {
                                    var children = parentData[$scope.options.childrenField];
                                    var flag;
                                    if(index) {
                                        flag = index;
                                    } else {
                                        flag = $.inArray(node, children);
                                    }
                                    children.splice(flag, 1);
                                    scope.$parent.$nodeChildren.splice(flag,1);
                                // } else {
                                //     scope.treeData.splice($.inArray(data, scope.treeData), 1);
                                // }

                                //此处不适用递归,引用去掉后让内存自动回收
                                eachTreeScope(scope,function(ns) {
                                    //在map中销毁所有已删除的节点
                                    delete $scope.$nodeMap[ns.node.$$hashKey];
                                });
                            }
                            tree.toggle = function(node) {
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
                            tree.expandAll = function(node) {
                                var nodeScope = getScopeByNode(node);
                                eachTreeScope(nodeScope, function (ns) {
                                    ns.$model.$collapsed = false;
                                });
                            }
                            tree.collapseAll = function(node) {
                                var nodeScope = getScopeByNode(node);
                                eachTreeScope(nodeScope, function (ns) {
                                    ns.$model.$collapsed = true;
                                });
                            }
                        }
                    }

                    var getScopeByNode = function(node) {
                        if (node == null || node == undefined) {
                            return null;
                        }
                        return $scope.$nodeMap[node.$$hashKey];
                        // for(var field in $scope.$nodeMap) {
                        //     if($scope.$nodeMap[field].node == node) {
                        //         return $scope.$nodeMap[field];
                        //     }
                        // }
                        return null;
                    }
                    /**
                     * 遍历同级节点Scope,只遍历同级,不深层遍历
                     * @param nodeScope 要遍历同级节点的节点
                     * @param fn
                     * @returns {*}
                     */
                    var eachSameLevelScope = function (nodeScope, fn) {
                        if (nodeScope == undefined || nodeScope == null) {
                            return;
                        }
                        var parentScope = nodeScope.$parent;
                        var length = parentScope.$nodeChildren.length;
                        for (var i = 0; i < length; i++) {
                            var ret = fn(parentScope.$nodeChildren[i]);
                            if (ret == "return") {
                                return ret;
                            // } else if (ret == "break") {
                            //     break;
                            // } else if (ret == "continue") {
                            //     continue;
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
                        if (nodeScope == undefined || nodeScope == null) {
                            return;
                        }
                        var length = nodeScope.$nodeChildren.length;
                        for (var i = 0; i < length; i++) {
                            var ret = fn(nodeScope.$nodeChildren[i]);
                            if (ret == "return") {
                                return ret;
                            // } else if (ret == "break") {
                            //     break;
                            // } else if (ret == "continue") {
                            //     continue;
                            }
                        }
                    };
                    // /**
                    //  * 递归遍历树所有子集节点
                    //  * @param nodeScope 要遍历的树的根节点
                    //  * @param fn
                    //  */
                    // var eachAllChildScope = function (nodeScope, fn) {
                    //     //
                    //     return eachNextLevelScope(nodeScope, function (ns) {
                    //         return eachTreeScope(ns, fn);
                    //     })
                    // };
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

                        var parentScope = nodeScope.$parent;
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
                            if (eachNodeScope == nodeScope) {
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
                        return nodeScope.$nodeChildren.length == 0;
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

                        //叶子节点不进行关闭,非叶子节点,进行关闭
                        if (!isLeafNode(nodeScope) || nodeScope != getScopeByNode($scope.currentSelect)) {
                            nodeScope.$model.$collapsed = true;
                        }
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
                        if (nodeScope.$parent.$model) {
                            expandNode(nodeScope.$parent);
                        }

                        nodeScope.$model.$collapsed = false;
                    };

                }],
                compile: function(element, attrs, transclude) {
                    return function ( scope, element, attrs, ctrls ) {

                        ctrls.template( scope, function(clone) {
                            element.html('').append( clone );
                        });

                        //递归潜逃时候的transclude,存入scope之后,可在子节点中继续进行调用
                        scope.transclude = transclude;
                    }
                }
            };
        }
    ])
    .directive("zTreeNode", function() {
        return {
            restrict: 'A',
            scope:false,
            require: "^zTree",
            link: function( scope, element, attrs, ctrls) {
                // Rendering template for the current node

                ctrls.template(scope, function(clone) {
                    element.html('').append(clone);
                });
            }
        };
    })
    .directive("zTreeTransclude", function() {//为了让递归的指令都共用rootParentScope
        return {
            link: function(scope, element, attrs, controller) {

                var model = {
                    $nodeLevel:0,
                    // $nodeKey:null,
                    $collapsed:true,
                    $hasSelect:false,
                    $selected:false
                };

                model.$nodeChildren = [];
                if(scope.$parent.$model) {//代表非根节点
                    model.$nodeLevel = scope.$parent.$model.$nodeLevel+1;
                    // model.$nodeKey = scope.$parent.$model.$nodeKey + "_" + (scope.$parent.$nodeChildren.length+1);
                } else {//代表根节点
                    model.$nodeLevel = 1;
                    // model.$nodeKey = scope.$parent.$nodeChildren.length+1;
                }

                scope.$model = model;
                scope.$nodeChildren = [];
                //将scope加入整个树的map一维存储
                scope.$treeRootScope.$nodeMap[scope.node.$$hashKey] = scope;
                //将scope存入父级的子节点集合数组
                scope.$parent.$nodeChildren.push(scope);


                scope.transcludeScope = scope.$treeRootParentScope.$new();
                scope.transcludeScope.node = scope.node;
                scope.transcludeScope.$model = scope.$model;
                scope.$on('$destroy', function() {
                    scope.transcludeScope.$destroy();
                });

                scope.transclude(scope.transcludeScope, function(clone) {
                    element.empty();
                    element.append(clone);
                });
            }
        };
    });
;
